ko.bindingHandlers.editvalue = {
    init: function(element, valueAccessor) {
		let va = ko.unwrap(valueAccessor());
        let value = va.value;
        let fullKey = va.fullKey;
		let valueUnwrapped = ko.unwrap(value);
		let $element = $(element);

		$element.on('change', function() {
			let valueUnwrapped = $(this).val();
			let valueCorrectType;

			// convert input from string to the correct type
			if (!isNaN(valueUnwrapped)) {
				// number
				valueCorrectType = Number(valueUnwrapped);
			}
			else if (valueUnwrapped === 'true' || valueUnwrapped === 'false') {
				// boolean
				valueCorrectType = Boolean(valueUnwrapped);
			}
			else if (valueUnwrapped.charAt(0) !== `"`) {
				// string
				valueCorrectType = `"${valueUnwrapped}"`;
			}
			else {
				valueCorrectType = valueUnwrapped;
			}
			
			// send the data to devtools.html so it can be updated
			chrome.extension.sendMessage({ key: fullKey, value: valueCorrectType });
		});
    },
    update: function(element, valueAccessor) {
		let va = ko.unwrap(valueAccessor());
        let value = va.value;
        let fullKey = va.fullKey;
		let valueUnwrapped = ko.unwrap(value);
		let $element = $(element);

		$element.val(valueUnwrapped);
    }
};


// Calculate width of text from DOM element or string. By Phil Freo <http://philfreo.com>
$.fn.textWidth = function(text, font) {
	if (!$.fn.textWidth.fakeEl) $.fn.textWidth.fakeEl = $('<span>').hide().appendTo(document.body);
	$.fn.textWidth.fakeEl.text(text || this.val() || this.text()).css('font', font || this.css('font'));
	return $.fn.textWidth.fakeEl.width();
};

ko.bindingHandlers.resizeinput = {
    init: function(element, valueAccessor) {
		let $input = $(element);
		let font = `${$input.css("font-size")} ${$input.css("font-family")}`;

		// Resize based on text if text.length > 0
		// Otherwise resize based on the placeholder
		function resizeForText(text) {
			$(this).css("width", $.fn.textWidth(text, font));
		}
	  
		$input.keypress(function(e) {
			if (e.which && e.charCode) {
				let c = String.fromCharCode(e.keyCode | e.charCode);
				let $this = $(this);
				resizeForText.call($this, $this.val() + c);
			}
		});
	  
		// Backspace event only fires for keyup
		$input.keyup(function(e) {
			if (e.keyCode === 8 || e.keyCode === 46) {
				resizeForText.call($(this), $(this).val());
			}
		});
	  
		resizeForText.call($input, $input.val());
    }
};

function sortKnockoutViewmodel(a, b) {
	let aFirstChar = a.key.charAt(0);
	let bFirstChar = b.key.charAt(0);

	if (aFirstChar === "$" && bFirstChar === "$") {
		// a and b start with $, sort at end but alphabetically
		return a.key.substr(1).toLowerCase().localeCompare(b.key.substr(1).toLowerCase());
	}
	else if (aFirstChar === "$") {
		// a starts with $, sort a at end
		return 1; // if the function returns greater than zero, sort b before a
	}
	else if (bFirstChar === "$") {
		// b starts with $, sort b at end
		return -1; // if the function returns less than zero, sort a before b
	}

	// a and b don't start with $, sort alphabetically
	return a.key.toLowerCase().localeCompare(b.key.toLowerCase());
}

function colorfiedObject(obj_from_json) {
    if (typeof obj_from_json !== "object" || Array.isArray(obj_from_json)){
        // not an object, stringify using native function
        return JSON.stringify(obj_from_json);
	}
	
	let totalChars = 0;
	let maxCharLength = 250;
	let previewHTML = '';
	let loopEnded = false;

	Object.keys(obj_from_json).forEach((key) => {
		if (loopEnded) { return; }

		let value = obj_from_json[key];
		let valueClass = getColorClass(value);
		let valuePreview = getPreviewValue(value);
		totalChars += key.length + valuePreview.length;

		if (totalChars <= maxCharLength) {
			if (previewHTML.length !== 0) { previewHTML += ', '; }
			previewHTML += `<span class='object-preview-key'>${key}<span>: <span class='${valueClass}'>${valuePreview}</span>`;
		}
		else {
			if (previewHTML.length !== 0) { previewHTML += ', '; }
			previewHTML += `&#8230;`;
			loopEnded = true;
		}
	});

    return `{${previewHTML}}`;
}

function getColorClass(value) {
	switch (typeof value) {
		case "string":
			return "type-string";
		case "number":
			return "type-number";
		case "boolean":
			return "type-boolean";
		default:
			return "object-value";
	}
}

function getPreviewValue(value) {
	switch (typeof value) {
		case "string":
			return `"${value}"`;
		case "number":
			return value;
		case "boolean":
			return value;
		case "object":
			if (Array.isArray()) {
				return "[&#8230;]";
			}
			return "{&#8230;}";
		default:
			return value;
	}
}

ko.components.register('object-preview', {
    viewModel: function(params) {
		let vm = this;

		vm.key = params.key;
		vm.fullKey = vm.key;
		if (params.fullKey !== undefined) {
			if (!isNaN(Number(vm.key))) {
				vm.fullKey = params.fullKey + `[${vm.key}]`;
			}
			else if (vm.key.indexOf(" ") >= 0) {
				// keys with spaces need to be accessed via string
				vm.fullKey = params.fullKey + `["${vm.key}"]`;
			}
			else {
				vm.fullKey = params.fullKey + '.' + vm.key;
			}
		}

		vm.value = params.value;

		let expandedByDefault = false;
		if (vm.key === "$data") {
			expandedByDefault = true;
		}

		vm.isExpanded = ko.observable(expandedByDefault);
		vm.isExpandable = ko.pureComputed(() => {
			return vm.type() === "object";
		});
		vm.expand = () => {
			vm.isExpanded(!vm.isExpanded());
		};

		vm.objectPreview = ko.pureComputed(() => {
			// generate a preview of the object, only show the first ~500 chars
			return colorfiedObject(ko.unwrap(vm.value));
		});

		vm.objectKeys = ko.pureComputed(() => {
			return Object.entries(ko.unwrap(vm.value)).map(([key, value]) => {
				return {key, value};
			})
			.sort(sortKnockoutViewmodel);
		});

		vm.type = ko.pureComputed(function(){
			let value = ko.unwrap(vm.value);
			return typeof value;
		});

		// observables will have "()" at the end of the string, pretty hacky...
		vm.isObservable = ko.pureComputed(function(){
			const regexp = /\(\)$/;
			return regexp.test(vm.key);
		});

		vm.typeClass = ko.pureComputed(function(){
			return `type-${vm.type()}`;
		});
    },
	template: `
		<div class="list-key">
			<div class="break-line"></div>
			<span class="object-spacer" data-bind="css: { 'expandable': isExpandable, 'expanded': isExpanded }, click: expand"></span>
			<span class="object-name" data-bind="text: key, attr: { title: fullKey }"></span>
			<span>: </span>
			<!-- ko if: type() !== "object" && type() !== "function" -->
				<input class="object-value object-value-object" data-bind="editvalue: {value: value, fullKey: fullKey }, resizeinput: true, css: typeClass, disable: !isObservable(), attr: { title: type }" />
			<!-- /ko -->
			<!-- ko if: type() === "function" -->
				<span class="object-value object-value-function" data-bind="text: value, css: typeClass"></span>
			<!-- /ko -->
			<!-- ko if: type() === "object" && !isExpanded() -->
				<span class="object-preview" data-bind="html: objectPreview"></span>
			<!-- /ko -->
		</div>
		<!-- ko if: type() === "object" -->
			<div class="list-value">
				<!-- ko if: type() === "object" -->
					<!-- ko if: isExpanded() -->
						<div class="break-line"></div>
						<ul data-bind="foreach: objectKeys, css: { expanded: isExpanded }">
							<object-preview params="key: $data.key, value: $data.value, fullKey: $parent.fullKey"></object-preview>
						</ul>
					<!-- /ko -->
				<!-- /ko -->
				<!-- ko if: type() === "array" -->
					<!-- ko if: isExpanded() -->
						<div class="break-line"></div>
						<ul data-bind="foreach: objectKeys, css: { expanded: isExpanded }">
							<!-- ko text: $data.value --><!-- /ko -->, 
						</ul>
					<!-- /ko -->
				<!-- /ko -->
			</div>
		<!-- /ko -->
`
});


$(document).ready(function(){
	var testObject = {
		error: "There was an error loading knockout context"
	};

	function vm_property(key, value) {
		var self = this;

		self.key = key;
		self.value = value;
	}

	function pageVM() {
		var self = this;

		self.viewmodel = ko.observable(testObject);

		self.viewmodel_loop = ko.pureComputed(() => {
			return Object.entries(self.viewmodel())
				.map(([key, value]) => new vm_property(key, value))
				.sort(sortKnockoutViewmodel);
		});
	}

	window.pageViewModel = new pageVM();
	ko.applyBindings(window.pageViewModel);



	let devPanel = {
		isBeta: true,
		updatePreviewPlaceholder: (sidebar) => {
			if (!devPanel.isBeta) {
				sidebar.setObject(
					{ error: "The tab has not been loaded yet..." }
				);
			}
		},
		koContext: (observableToUpdate) => {
			if (typeof $0 === "undefined" || $0 === null) {
				// the selected element isn't in this frame
				return -1;
			}

			let contextFor = ko.contextFor($0);
			if (typeof contextFor === "undefined") {
				return {
					error: "The selected element doesn't have any knockout bindings"
				};
			}
			else {
				// set knockout data
				if (observableToUpdate !== undefined) {
					function resolve(obj, path){
						path = path.split('.');
						var current = obj;
						while(path.length) {
							if(typeof current !== 'object') return undefined;
							current = current[path.shift()];
						}
						return current;
					}

					// splits the key by period to access the value
					resolve(contextFor, observableToUpdate.key)(observableToUpdate.value);
					// then get knockout data and return it
				}


				// new method
				let maxSameObjectSerialize = 2;
				let objectsSeen = [];
				function replacer(key, value) {
					if (typeof value === 'object' && value !== null) {
						// stop recursive issues
						let sameObjectSerializeCount = objectsSeen.filter((o) => o === value).length;

						if (sameObjectSerializeCount >= maxSameObjectSerialize) {
							// clear the seen objects of this type
							objectsSeen = objectsSeen.filter((o) => o !== value);

							// stop serializing this object
							return "recursive object detected";
						}
						else {
							objectsSeen.push(value);
						}


						// if the item is an object, replace the keys that are observables
						var replacement = {};
						for (var k in value) {
							if (Object.hasOwnProperty.call(value, k)) {
								let newKey = k;
								let val = value[k];

								if (ko.isWritableObservable(val)) {
									// its an observable or writeable computed, add () to the key name so we know
									newKey = `${newKey}()`;
								}

								replacement[newKey] = val;
							}
						}
						return replacement;
					}


					// otherwise we're good to go
					switch (key) {
						case "ko":
							return undefined;

						case "$root":
							if (value === window) {
								return "(Global window object)";
							}
							else {
								try {
									return ko.toJS(value);
								}
								catch (toJsErr) {
									return `Exception: ${toJsErr}`;
								}
							}

						default:
							// get the underlying knockout value
							if (ko.isObservable(value)) {
								value = ko.unwrap(value);
							}
							
							if (typeof value === "function") {
								return value.toString();
							}
							else {
								return value;
							}
					}
				}

				return JSON.stringify(contextFor, replacer);
			}
		},
		updatePreview: (sidebar, newViewmodel) => {
			if (!devPanel.isBeta) {
				sidebar.setObject(newViewmodel);
			}
		},
		updatePreviewBETA: (newViewmodel) => {
			console.log("updating beta preview");
			// send the data to the frame so it can run the update
			chrome.extension.sendMessage(newViewmodel, function(response){
				console.log("updated observable, new viewmodel", response);
			});
		}
	};

	function getAllFrames(){
		var allFrameSRC = Array.prototype.slice.call(document.getElementsByTagName("iframe")).map((i) => i.src);
		return allFrameSRC;
	}


	// expecting request from panel here
	chrome.extension.onMessage.addListener(function (knockoutObject) {
		window.pageViewModel.viewmodel(knockoutObject);
	});


	chrome.devtools.panels.elements.createSidebarPane("Knockout Data",
		function(sidebar) {
			sidebar.setPage("devtools.html");
			sidebar.setHeight("8ex");

			// in theory the user should never see this, this is only shown until the knockout data tab is clicked on
			devPanel.updatePreviewPlaceholder(sidebar);

			function selectionChanged() {
				populateKnockoutData(sidebar);
			}

			function messageListener(knockoutObject) {
				let nameWithoutParentheses = knockoutObject.key.split("()")[0];
				knockoutObject.key = nameWithoutParentheses;
				console.log("editing observable", knockoutObject.key);
				populateKnockoutData(sidebar, knockoutObject);
			}

			// add knockout data when the tab is shown
			sidebar.onShown.addListener((win) => {
				selectionChanged();

				// update knockout data every time the selected element changes
				chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
					populateKnockoutData(sidebar);
				});

				// message from devtools.html to update observable
				chrome.extension.onMessage.addListener(messageListener);


				// expecting request from panel here
			});

			// add knockout data when the tab is shown
			sidebar.onHidden.addListener((win) => {
				// remove knockout data
				devPanel.updatePreviewPlaceholder(sidebar);

				// unbind listen until the tab is shown again
				chrome.devtools.panels.elements.onSelectionChanged.removeListener(() => {
					populateKnockoutData(sidebar);
				});

				// unbind message listener
				chrome.extension.onMessage.removeListener(messageListener);
			});
		}
	);

	/**
	 * 
	 * @param {*} sidebar 
	 * @param {*} frame 
	 * @param {*} observableToUpdate key/value to change observable to
	 */
	function searchSubFrames(sidebar, frame, observableToUpdate) {
		console.log("searching frame", frame);

		// get all frames on the passed frame
		chrome.devtools.inspectedWindow.eval(
			"(" + getAllFrames.toString() + ")()",
			{frameURL: frame},
			(frameResult, frameErrors) => {
				let filteredFrames = frameResult;
				let errorMessage;
				if (frameResult !== undefined) {
					// inner frames that have a src attribute can be searched, unless the src attribute is duplicated
					let duplicateIframeSrcExists = arrayHasDuplicates(frameResult);
					if (duplicateIframeSrcExists) {
						errorMessage = "Multiple iframes on the page with the same url, chrome didn't know which one to inspect";
					}

					// unfortunaley inner iframes generated by javascript cannot be inspected due to a chrome limitation, let the user know
					// see https://bugs.chromium.org/p/chromium/issues/detail?id=637304
					let framesWithoutSrc = frameResult.find((x) => x === "javascript:;");
					if (framesWithoutSrc !== undefined) {
						// filter out the frames we can't search
						filteredFrames = frameResult.filter((x) => x !== "javascript:;" && x !== "");
						errorMessage = "Chrome cannot inspect iframes generated by javascript, see bug https://bugs.chromium.org/p/chromium/issues/detail?id=637304";
					}
				}

				filteredFrames.forEach((src) => {
					let command = `(${devPanel.koContext.toString()})(${JSON.stringify(observableToUpdate)})`;

					// for each iframe see if the element the user inspected is in there
					chrome.devtools.inspectedWindow.eval(
						command,
						{frameURL: src},
						(subFrameResult, srcErrors) => {
							if (!srcErrors && subFrameResult !== -1) {
								// no errors, result is -1 when its not on the page - so we found it!
								console.log("Result found in subframe", src);

								// we are doing a get
								if (devPanel.isBeta) {
									devPanel.updatePreviewBETA(JSON.parse(subFrameResult));
								}
								else {
									devPanel.updatePreview(sidebar, JSON.parse(subFrameResult));
								}
							}
							else {
								// continue searching subframes
								searchSubFrames(sidebar, src, observableToUpdate);
							}
						}
					);
				});
			}
		);
	}

	function populateKnockoutData(sidebar, observableToUpdate) {
		let command = `(${devPanel.koContext.toString()})(${JSON.stringify(observableToUpdate)})`;

		// first check the current top frame for the inspected element
		chrome.devtools.inspectedWindow.eval(
			command,
			(result, errors) => {
				if (!errors && result !== -1) {
					// no errors, result is -1 when its not on the page - so we found it!
					console.log("Result found in top frame");

					// we are doing a get
					if (devPanel.isBeta) {
						devPanel.updatePreviewBETA(JSON.parse(result));
					}
					else {
						devPanel.updatePreview(sidebar, JSON.parse(result));
					}
				}
				else {
					// search all sub frames
					searchSubFrames(sidebar, undefined, observableToUpdate);
				}
			}
		);
	}

	function arrayHasDuplicates(array) {
		return (new Set(array)).size !== array.length;
	}
});