const hub = (() => {
	const key = "hub-uri";
	let worker;
	const promise = new Promise(resolve => {
		let uri = sessionStorage.getItem(key);
		const make = () => {
			uri = URL.createObjectURL(new Blob([`
				"use strict";

				const port_set = new Set;
				addEventListener("connect", ({ports: [...ports]}) => ports.forEach(port => {
					port_set.add(port);
					port.addEventListener("message", ({data}) => {
						if(data instanceof Array){
							[...port_set].forEach(port => port.postMessage(data));
						}else if(data === "disconnect"){
							port_set.delete(port);
						}
					});
					port.start();
					port.postMessage("connected");
				}));
			`], {type: "text/javascript"}));
			sessionStorage.setItem(key, uri);
		};
		const onerror = () => {
			worker.removeEventListener("error", onerror);
			if(uri === (uri = sessionStorage.getItem(key))) make();
			connect();
		};
		const connect = () => {
			worker = new SharedWorker(uri);
			worker.port.addEventListener("message", ({data}) => {
				if(data === "connected"){
					worker.removeEventListener("error", onerror);
					resolve();
				}
			});
			worker.port.start();
		};
		try{
			if(!uri) throw null;
			connect();
			worker.addEventListener("error", onerror);
		}catch(error){
			make();
			connect();
		}
	});
	return {
		send: (...list) => {
			promise.then(() => worker.port.postMessage(list));
		},
		on: async listener => {
			await promise;
			const onmessage = ({data}) => {
				if(data instanceof Array) listener(...data);
			};
			worker.port.addEventListener("message", onmessage);
			return () => worker.port.removeEventListener("message", onmessage);
		},
	};
})();
self.hub = hub;

const multi_key_map = () => {
	const tree = new Map;
	const symbol = Symbol();
	return {
		set: (...args) => {
			const keys = [...args.slice(0, -1), symbol];
			const [value] = args.slice(-1);
			const f0 = (parent, ...keys) => {
				if(keys.length > 1){
					if(!parent.has(keys[0])) parent.set(keys[0], new Map);
					f0(parent.get(keys[0]), ...keys.slice(1));
				}else{
					parent.set(keys[0], value);
				}
			};
			const f1 = (parent, ...keys) => {
				if(keys.length > 1){
					if(parent.has(keys[0]) && f1(parent.get(keys[0]), ...keys.slice(1)) === 0) parent.delete(keys[0]);
				}else{
					parent.delete(keys[0]);
				}
				return parent.size;
			};
			(value === undefined ? f1 : f0)(tree, ...keys);
		},
		get: (...args) => {
			const f = (parent, ...keys) => parent && keys.length > 0 ? f(parent.get(keys[0]), ...keys.slice(1)) : parent;
			return f(tree, ...args, symbol);
		},
	};
};
self.multi_key_map = multi_key_map;

const tube = (() => {
	const dp = new WeakMap;
	return f => {
		if(!dp.has(f)){
			const cache = multi_key_map();
			const tube = (...args) => {
				const start = () => {
					if(!cache.get(...args)){
						const thunk0 = f(...args);
						const thunk1 = listener => {
							thunks.push(thunk1);
							const cache1 = multi_key_map();
							const send = () => {
								if(!lock){
									lock = true;
									(async () => {
										const cancel1 = cancel0 || () => {};
										cancel0 = null;
										await cancel1();
										cancel0 = listener(...results);
										lock = false;
									})();
								}
							};
							let results;
							let cancel0;
							let lock = false;
							const thunk2 = thunk0((...results1) => {
								if(!results || !cache1.get(...results1)){
									cache1.set(...results, undefined);
									results = results1;
									cache1.set(...results, true);
									send();
								}
							});
							const cancel1 = () => {
								listener = () => {};
								send();
								lock = false;
								const index = thunks.push(listener1 => {
									thunks.splice(index);
									listener = listener1;
									cancel0 = listener(...results);
									return cancel1;
								}) - 1;
								setTimeout(() => {
									thunks.splice(index);
								}, 0);
							};
							return cancel1;
						};
						const thunks = [thunk1];
						cache.set(...args, thunks);
					}
				};
				start();
				return listener => {
					start();
					return cache.get(...args).pop()(listener);
				};
			};
			dp.set(f, tube);
			dp.set(tube, tube);
		}
		return dp.get(f);
	};
})();
