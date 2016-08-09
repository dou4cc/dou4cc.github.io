"use strict";

const global = this;

const cache = f => {
	const weak_map = new WeakMap;
	const map = new Map;
	return x => {
		if(!weak_map.has(x) && !map.has(x)){
			const f_x = f(x);
			try{
				weak_map.set(x, f_x);
			}catch(error){
				map.set(x, f_x);
			}
		}
		return weak_map.get(x) || map.get(x);
	};
};

const require = cache(async uri => {
	const source = await (await fetch(uri)).text();
	new (async () => {}).constructor('"use strict";' + source);
	return await global.eval('"use strict"; async () => {' + source + "}")();
});

require(URL.createObjectURL(new Blob([document.currentScript.textContent])));
