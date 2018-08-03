# Knockout Data Insepector
A chrome dev tools extension that displays the bound knockout data for the inspected element.

#### Demo: Download via the Chrome store

You can see the data in the devtools sidebar when inspecting an element
![knockout data in devtools](https://raw.githubusercontent.com/SamKirkland/Knockout-Data-Insepector/master/screenshots/devtools.png)

#### Goals of the project
Some of the main goals are to resolve outstanding and closed github issues, resolve some performance issues, and implement new features

- [x] *(Completed)* Debugger doesn't work in iframes [(32)](https://github.com/timstuyckens/chromeextensions-knockoutjs/issues/32)
    - The debugger will now inspect iframes (and iframe within iframes) there are some limitations to this due to chrome
    - iFrames that have no source html cannot be insepected (jsfiddle), this is a chrome limitation
    - iFrames with duplicate names cannot be properly inspected - the first frame is used, this is a chrome limitation
- [x] *(Completed)* Allow editing of observables/computed [(17)](https://github.com/timstuyckens/chromeextensions-knockoutjs/issues/17)
    - Properties that are editable will appear with () after them and can be edited
- [x] *(Completed)* Model properties appear with quotes [(15)](https://github.com/timstuyckens/chromeextensions-knockoutjs/issues/15)
- [x] *(Completed)* Excessive memory usage. [(31)](https://github.com/timstuyckens/chromeextensions-knockoutjs/issues/31)
    - This will be a ongoing process, however the main issue was fixed (the knockout context was being loaded, even when the plugin wasn't shown)
- [ ] ko not found in webpack project [(5, 6, 8, and 34)](https://github.com/timstuyckens/chromeextensions-knockoutjs/issues/5)
- [ ] Panel only refreshes when selection of DOM changed. Not when observable changes [(1, 4, and 26)](https://github.com/timstuyckens/chromeextensions-knockoutjs/issues/1)
- [ ] Show Dependencies/Subscriptions Count next to observables
    - use .getDependenciesCount() and .getSubscriptionsCount()
    - "Returns the current number of dependencies of the computed observable."

### License
MIT