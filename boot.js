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

const multi_key_map = () => {
	const tree = new Map;
	const symbol = Symbol();
	return {
		set: (...args) => {
			const keys = [...args.slice(0, -1), symbol];
			const [value] = args.slice(-1);
			const f0 = (parent, ...keys) => {
				if(keys.length > 1){
					if(parent.has(keys[0]) && f0(parent.get(keys[0]), ...keys.slice(1)) === 0) parent.delete(keys[0]);
				}else{
					parent.delete(keys[0]);
				}
				return parent.size;
			};
			const f1 = (parent, ...keys) => {
				if(keys.length > 1){
					if(!parent.has(keys[0])) parent.set(keys[0], new Map);
					f1(parent.get(keys[0]), ...keys.slice(1));
				}else{
					parent.set(keys[0], value);
				}
			};
			(value === undefined ? f0 : f1)(tree, ...keys);
		},
		get: (...args) => {
			const f = (parent, ...keys) => parent && keys.length > 0 ? f(parent.get(keys[0]), ...keys.slice(1)) : parent;
			return f(tree, ...args, symbol);
		},
	};
};

const tube = (() => {
	const dp = new WeakMap;
	return source => dp.get(source) || (() => {
		const storage = multi_key_map();
		const tube0 = (...condition) => {
			const sync = () => {
				state = storage.get(...condition);
				if(state){
					state.handle_num += 1;
				}else{
					let resolve;
					const thunk = new Promise(resolve1 => resolve = resolve1);
					state = {
						alive: true,
						thunk: async (...args) => {
							if(await thunk || args.length > 0) (await thunk)(...args);
						},
						handle_num: 1,
						listener_num: 0,
						cache: new Set,
					};
					storage.set(...condition, state);
					resolve(source(...condition));
				}
			};
			const unsync = () => {
				state.handle_num -= 1;
				if(state.handle_num === 0){
					state.alive = false;
					storage.set(...condition, undefined);
					state.thunk();
				}
			};
			const listen = listener => {
				const f0 = listener => {
					const update = () => {
						const f = (a, b) => a.length === 0 || a[0] === b[0] && f(a.slice(1), b.slice(1));
						if(!solution1 || solution.length !== solution1.length || !f(solution, solution1)){
							lock = true;
							Promise.all([(async () => {
								await (cancel || (() => {}))();
								solution1 = solution;
								cancel = listener(...solution1);
							})(), new Promise(resolve => setTimeout(resolve, 0))]).then(update);
						}else{
							lock = false;
						}
					};
					let lock = false;
					let cancel;
					let solution1;
					return [
						(...solution1) => {
							solution = solution1;
							if(!lock) update();
						},
						() => {
							listener = () => {};
							if(solution){
								solution1 = null;
								if(!lock) update();
							}
						},
					];
				};
				const f1 = () => {
					let used = false;
					return () => {
						if(!used){
							used = true;
							cancel();
							const listen = listener1 => {
								clearTimeout(timer);
								state.cache.delete(listen);
								[listener, cancel] = f0(listener1);
								if(solution) listener(...solution);
								return f1();
							};
							state.cache.add(listen);
							const timer = setTimeout(() => {
								state.cache.delete(listen);
								listener_num -= 1;
								state.listener_num -= 1;
								if(listener_num === 0) unsync();
								thunk.then(thunk => (thunk || (() => {}))());
							}, 0);
						}
					};
				};
				used = true;
				listener_num += 1;
				state.listener_num += 1;
				let solution;
				let cancel;
				[listener, cancel] = f0(listener);
				const thunk = state.thunk((...solution) => listener(...solution));
				return f1();
			};
			let state;
			let used = false;
			let listener_num = 0;
			sync();
			return listener => {
				if(listener){
					if(!state || !state.alive) sync();
					if(state.listener_num > 0){
						for(let thunk of state.cache) return thunk(listener);
						let timer;
						const promise = new Promise(resolve => {
							timer = setTimeout(() => {
								timer = null;
								for(let thunk of state.cache) return resolve(thunk(listener));
								resolve(listen(listener));
							}, 0);
						});
						return () => {
							if(timer){
								clearTimeout(timer);
							}else{
								promise.then(thunk => thunk());
							}
						};
					}
					return listen(listener);
				}
				if(!used) setTimeout(() => {
					if(!used){
						used = true;
						unsync();
					}
				}, 0);
			};
		};
		dp.set(tube0, tube0);
		dp.set(source, tube0);
		return tube0;
	})();
})();

const cascade = (() => {
	const dp = new WeakMap;
	return (...tubes) => {
		const cascade0 = (() => {
			switch(tubes.length){
			case 0:
				return tube((...args) => listener => {
					if(listener) listener(...args);
				});
			case 1:
				return dp.get(tubes[0]) || (() => {
					const solutions = [];
					const comparer = ([a], [b]) => a - b;
					const tube0 = tube((...condition) => {
						const thunk = tube(tubes[0])(...condition);
						return listener => {
							if(listener){
								let used = false;
								const thunk1 = thunk((...solution) => {
									used = true;
									listener(performance.now(), ...solution);
								});
								if(!used && solutions.length > 0) listener(...solutions.pop());
								return thunk1;
							}
							thunk();
						};
					});
					const tube1 = tube((...condition) => {
						const thunk = tube0(...condition);
						return listener => {
							if(listener) return thunk((stamp, ...solution) => {
								listener(...solution);
								return () => {
									solutions.push([stamp, ...solution]);
									solutions.sort(comparer);
								};
							});
							thunk();
						};
					});
					return tube1;
				})();
			case 2:
				tubes = tubes.map(tube0 => cascade(tube0));
				return tube((...condition) => {
					const listen = listener => {
						cancel_map.set(listener, () => {
							cancel_map.delete(listener);
							try{
								thunk;
							}catch(error){
								setTimeout(thunk, 0);
								return;
							}
							thunk();
						});
						const thunk = thunk1(listener);
					};
					const listener_set = new Set;
					const cancel_map = new Map;
					const thunk0 = tubes[0](...condition)((...args) => {
						thunk1 = tubes[1](...args);
						[...listener_set].forEach(listener => listen(listener));
						return () => {
							thunk1 = null;
							cancel_map.forEach(cancel => cancel());
						};
					});
					let thunk1;
					return listener => {
						if(listener){
							listener_set.add(listener);
							if(thunk1) listen(listener);
							return () => {
								listener_set.delete(listener);
								cancel_map.get(listener)();
							};
						}
						thunk0();
					};
				});
			default:
				return cascade(tubes[0], cascade(...tubes.slice(1)));
			}
		})();
		dp.set(cascade0, cascade0);
		return cascade0;
	};
})();
self.cascade = cascade;

self.a = cascade(
	() => listener => {
		if(listener){
			const onmousemove = ({screenX, screenY}) => listener(screenX, screenY);
			addEventListener("mousemove", onmousemove);
			return () => removeEventListener("mousemove", onmousemove);
		}
	},
	(x, y) => listener => {
		if(listener) listener(x + ", " + y);
	},
	content => listener => {
		if(listener) listener(document.createTextNode(content));
	}
);
self.b = text => {
	document.body.append(text);
	return () => text.remove();
};

return () => {
	throw "请点击：";
};
