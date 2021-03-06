(function() {
	var $m = function() {
		// fix for browsers that don't support the dataset property
		var dataset = function(element, ds) {
			return element.dataset ?
				element.dataset[ds] :
				element.getAttribute("data-" + ds);
		};
		
		// custom template renderers
		var customRenderers = {};
		var custom = function(mode, f) {
			customRenderers[mode] = f;
		};
		
		// make the dataset function available to custom renderers
		custom.dataset = dataset;
		
		// clone node and attach it to the same parent
		var cloneAndAttach = function(element, parent, first) {
			parent = parent || element.parentNode;
			
			return first && dataset(parent, "mode") === "prepend" ?
				parent.insertBefore(element.cloneNode(true), first) :
				parent.appendChild(element.cloneNode(true));
		};
		
		// builtin renderer for hashmaps
		var renderObject = function(json, element) {
			if (element && dataset(element, "render") in customRenderers)
				customRenderers[dataset(element, "render")](json, element);
			else
				for (var i in json) render(json[i], i);
		};
		
		// builtin renderer for arrays
		var renderArray = function(json, element) {
			var child = element._cache || element.firstElementChild;
			element._cache = element._cache || element.removeChild(child);
			
			// if we're not appending nor prepending, remove children
			if (!dataset(element, "mode"))
				while (element.firstElementChild) element.removeChild(element.firstElementChild);
			
			var first = element.firstElementChild;
			
			// let cloneAndAttach handle modes, eh!
			for (var i in json)
				if (dataset(child, "render") in customRenderers)
					customRenderers[dataset(child, "render")](json[i], cloneAndAttach(child, element, first));
				else
					render(json[i], cloneAndAttach(child, element, first));
		};
		
		// builtin renderer for textual data (strings, numbers & booleans)
		var renderText = function(json, element) {
			switch (dataset(element, "mode")) {
				case "append":  element.innerHTML += json;                     break;
				case "prepend": element.innerHTML  = json + element.innerHTML; break;
				default:        element.innerHTML  = json;                     break;
			}
		};
		
		// main renderer
		var render = function(json, element) {
			var base = element && element.parentNode ? element.parentNode : document;
			
			element = typeof element === "string" ?
				document.getElementById(element) || base.getElementsByClassName(element)[0] || base.querySelector(element) : // by default, an id, otherwise a CSS selector
				element; // otherwise just assume it's any sort of DOM element
			
			if (element && dataset(element, "render") in customRenderers)
				customRenderers[dataset(element, "render")](json, element);
			else
				switch (Object.prototype.toString.call(json)) {
					case "[object Object]": renderObject(json, element); break;
					case "[object Array]":  renderArray(json, element);  break;
					default:                renderText(json, element);   break;
				}
		};
		
		render.custom = custom;
		render.render = render;
		
		return render;
	};
	
	window.minimal = window.$m = $m();
	
	// attr custom renderer
	window.$m.custom("attr", function(json, element) {
		for (var i in json)
			if (i === "content") {
				if (typeof json[i] === "object")
					window.$m.render(json[i], element);
				else
					element.innerHTML = json[i];
			}
			else
				element.setAttribute(i, json[i]);
	});
	
	// children custom renderer
	window.$m.custom("children", function(json, element) {
		var iterable = Object.prototype.toString.call(json) === "[object Object]" ? json : [].concat(json);
		
		for (var item in iterable) {
			var currentElement = element.children[item] || element.getElementsByClassName(item)[0] || element.querySelector(item);
			var currentJSON = iterable[item];
			
			window.$m.render(currentJSON, currentElement);
		}
	});
	
	// embedded nanotemplate.js, available at https://github.com/ruidlopes/nanotemplatejs
	(function() {
		var _tregex = /(\$\w+)/g;
		
		String.prototype.template = String.prototype.t = function() {
			if (arguments[0] instanceof Array)
				return arguments[0].map(this.t, this).join("");
			else {
				var args = typeof arguments[0] === "object" ? arguments[0] : arguments;
				return this.replace(_tregex, function(match) { return args[match.substr(1)]; });
			}
		};

		if (typeof Element === "function")
			Element.prototype.template = Element.prototype.t = function() {
				this._tcache = this._tcache || this.innerHTML;
				this.innerHTML = this._tcache.t.apply(this._tcache, arguments);
			};
	})();
	
	// nanotemplate.js custom renderer
	window.$m.custom("nano", function(json, element) {
		element.template(json);
	});
})();