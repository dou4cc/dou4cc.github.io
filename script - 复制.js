"use strict";

(async () => {
	const source = document.currentScript.textContent;
	new (async () => {}).constructor('"use strict";' + source);
	const result = await this.eval(`"use strict"; async () => {
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
			new require.constructor('"use strict";' + source);
			return await eval(\`"use strict"; async () => {
				{\${source}}
				let uri, source;
			}\`)();
		});
		const collect = (thunks, ref) => {
			const n = thunks.length;
			const count = new Set;
			const results = [];
			thunks.map((thunk, i) => thunk(result => {
				results[i] = result;
				count.add(thunk);
				count.size === n && ref(results);
			}));
			return () => void thunks.forEach(thunk => thunk());
		};
		const recycle = f => {
			const weak_map = new WeakMap;
			const map = new Map;
			return (x, ref) => {
				let f_x;
				if(weak_map.has(x)){
					const stack = weak_map.get(x);
					f_x = stack.pop();
					stack.length === 0 && weak_map.delete(x);
				}else if(map.has(x)){
					const stack = map.get(x);
					f_x = stack.pop();
					stack.length === 0 && map.delete(x);
				}else{
					f_x = f(x);
				}
				const process = setTimeout(ref, 0, f_x);
				return () => {
					clearTimeout(process);
					try{
						!weak_map.has(x) && weak_map.set(x, []);
						weak_map.get(x).push(f_x);
					}catch(error){
						!map.has(x) && map.set(x, []);
						map.get(x).push(f_x);
					}
				};
			};
		};

		${source}
	}`)();
	result != null && console.log(result);
})();
