const {hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = library;
library = Object.create(library);
const cancels = new Set;

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
					const [hell0, resolve] = hell();
					state = {
						alive: true,
						thunk: genfn2tick(function*(...args){
							if(yield hell0 || args.length > 0) (yield hell0)(...args);
						}),
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
							genfn2tick(function*(){
								const [hell0, resolve] = hell();
								setTimeout(resolve, 0);
								yield (cancel || (() => {}))();
								solution1 = solution;	
								cancel = listener(...solution1);
								yield hell0;
								update();
							})();
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
							const [hell0, resolve] = hell();
							listener = () => resolve();
							if(solution){
								solution1 = null;
								if(!lock) update();
							}
							return hell0;
						},
					];
				};
				const f1 = () => {
					let used = false;
					return genfn2tick(function*(){
						if(!used){
							used = true;
							const hell0 = cancel();
							const listen = listener1 => {
								clearTimeout(timer);
								state.cache.delete(listen);
								[listener, cancel] = f0(listener1);
								if(solution) listener(...solution);
								return f1();
							};
							state.cache.add(listen);
							const timer = setTimeout(genfn2tick(function*(){
								state.cache.delete(listen);
								state.listener_num -= 1;
								yield (yield thunk || (() => {}))();
								listener_num -= 1;
								if(listener_num === 0) unsync();
							}), 0);
							yield hell0;
						}
					});
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
						const [hell0, resolve] = hell();
						let timer = setTimeout(() => {
							timer = null;
							for(let thunk of state.cache) return resolve(thunk(listener));
							resolve(listen(listener));
						}, 0);
						return () => {
							if(timer){
								clearTimeout(timer);
							}else{
								hell0(thunk => thunk());
							}
						};
					}
					return listen(listener);
				}
				setTimeout(() => {
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

const tubeline = (() => {
	const dp = new WeakMap;
	return (...tubes) => {
		const tubeline0 = (() => {
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
				tubes = tubes.map(tube0 => tubeline(tube0));
				return tube((...condition) => {
					const listen = listener => {
						cancel_map.set(listener, () => {
							cancel_map.delete(listener);
							try{
								thunk;
							}catch(error){
								Promise.resolve().then(thunk).catch(error => setTimeout(() => {
									throw error;
								}, 0));
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
				return tubeline(tubes[0], tubeline(...tubes.slice(1)));
			}
		})();
		dp.set(tubeline0, tubeline0);
		return tubeline0;
	};
})();

const db = (() => {
	const hub_source = `port => ({
		send: (...list) => {
			tickline(port => port.postMessage(list))(port);
		},
		on: genfn2tick(function*(listener){
			const onmessage = ({data}) => {
				if(data instanceof Array) listener(...data);
			};
			(yield port).addEventListener("message", onmessage);
			return genfn2tick(function*(){
				(yield port).removeEventListener("message", onmessage);
			});
		}),
	})`;
	const [hub_uri, hub] = (() => {
		const key = "hub-uri";
		let worker;
		const onunload = () => {
			try{
				worker.port.postMessage("disconnect");
			}catch(error){}
		};
		addEventListener("unload", onunload);
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
							port.close();
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
		const [hell0, resolve] = hell();
		const connect = () => {
			worker = new SharedWorker(uri);
			worker.port.addEventListener("message", ({data}) => {
				if(data === "connected"){
					worker.removeEventListener("error", onerror);
					resolve(uri);
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
		cancels.add(genfn2tick(function*(){
			yield hell0;
			worker.port.postMessage("disconnect");
			removeEventListener("unload", onunload);
		}));
		return [hell0, self.eval('"use strict"; ' + hub_source)(tickline(() => worker.port)(hell0))];
	})();
	const name = ".";
	const end = Symbol();
	const formatted_end = "";
	const format = list => {
		for(let i = 0, l = list.length; i < l; i += 1) if((list[i] = list[i] === end ? formatted_end : [list[i]]) === formatted_end){
			list.splice(i + 1, l);
			break;
		}
		indexedDB.cmp(list, 0);
		return list;
	};
	const unformat = list => list.map(a => a === formatted_end ? end : a[0]);
	const put_uri = (() => {
		const uri = URL.createObjectURL(new Blob([`
			"use strict";

			const {hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = self.eval('"use strict"; ' + unescape("${escape(library_source)}"));

			const [hell0, resolve0] = hell();
			const [hell1, resolve1] = hell();
			hell0(port => {
				port.addEventListener("message", ({data}) => {
					if(data === "connected") resolve1(port);
				});
				port.start();
			});
			const hub = self.eval('"use strict"; ' + unescape("${escape(hub_source)}"))(hell1);

			const end = unescape("${escape(formatted_end)}");
			const del_db = db => {
				db.close();
				indexedDB.deleteDatabase(db.name);
			};
			const auto_close = transaction => {
				transaction.addEventListener("complete", () => tansaction.db.close());
				return transaction;
			};
			const f = (name, ...list) => {
				const f1 = ({transaction: {db}}) => {
					if(list.length > 1){
						const abort = f(name => {
							auto_close(db.transaction(["store"], "readwrite")).objectStore("store").get(list[0]).addEventListener("success", ({target: {source, result}}) => {
								if(result){
									if("value" in result){
										f(result.value, ...list.slice(1));
									}else{
										source.put({key: list[0], value: name});
									}
								}else{
									abort();
								}
							});
						}, ...list.slice(1));
						return abort;
					}
				};
				if(typeof name === "function"){
					const make = () => {
						const abort0 = () => del_db(cn.result);
						let abort1 = () => {
							make1 = () => {};
							cn.removeEventListener("upgradeneeded", onupgradeneeded);
							cn.addEventListener("upgradeneeded", abort0);
						};
						let make1 = () => abort1 = make();
						const onsuccess = () => {
							cn.result.close();
							make1();
						};
						const onupgradeneeded = () => {
							const store = cn.result.createObjectStore("store", {keyPath: "key"});
							auto_close(store.transaction).addEventListener("complete", () => name(store.transaction.db.name));
							store.put({key: list[0]});
							const abort2 = f1(store);
							abort1 = () => {
								name = () => {};
								abort2();
								abort0();
							};
						};
						const cn = indexedDB.open(Date.now() + Math.random().toString().slice(1));
						cn.addEventListener("success", onsuccess);
						cn.addEventListener("blocked", make1);
						cn.addEventListener("upgradeneeded", () => cn.removeEventListener("success", onsuccess));
						cn.addEventListener("upgradeneeded", onupgradeneeded);
						return () => abort1();
					};
					return make();
				}
				const onsuccess = ({target: {result}}) => {
					const store = auto_close(result.tansaction(["store"], "readwrite")).objectStore("store");
					store.count().addEventListener("success", ({target: {result}}) => {
						if(result > 0) store.get(end).addEventListener("success", ({target: {result}}) => {
							if(!result){
								if(list[0] === end){
								}else{
									store.get(list[0]).addEventListener("success", ({target: {result}}) => {
										if(result && "value" in result){
											f(result.value, ...list.slice(1));
										}else{
											if(!result) store.put({key: list[0]});
											f1(store);
										}
									});
								}
							}
						});
					});
				};
				const cn = indexedDB.open(name);
				cn.addEventListener("upgradeneeded", () => {
					cn.removeEventListener("success", onsuccess);
					del_db(cn.result);
				});
				cn.addEventListener("success", onsuccess);
			};

			addEventListener("message", ({data, ports: [port]}) => {
				if(port) resolve0(port);
				if(data) f(...data);
			});
		`], {type: "text/javascript"}));
		const onunload = () => URL.revokeObjectURL(uri);
		addEventListener("unload", onunload);
		cancels.add(() => {
			onunload();
			removeEventListener("unload", onunload);
		});
		return uri;
	})();
	return {
		put: (...list) => {
			const if_exist = (name, yes, no) => {
				const cn = indexedDB.open(name);
				cn.addEventListener("success", yes);
				cn.addEventListener("blocked", () => no());
				cn.addEventListener("upgradeneeded, () => {
					cn.removeEventListener("success", yes);
					cn.result.close();
					indexedDB.deleteDatabase(name);
					no();
				});
			};
			const auto_close = transaction => {
				transaction.addEventListener("complete", () => tansaction.db.close());
				return transaction;
			};
			const f = (callback, name, ...list) => {
				const visit = (store, name) => store.get(list[0]).addEventListener("success", ({target: {result}}) => {
					const callback1 = name => if_exist(store.transaction.db.name, ({target: {result}}) => visit(auto_close(result.transaction(["store"], "readwrite")).objectStore("store"), name), callback);
					if(result === undefined){
						if(name == null){
							f(callback1, null, ...list.slice(1));
						}else{
							store.add({key: list[0], value: name});
						}
					}else{
						f(callback1, result, ...list.slice(1));
					}
				});
				const put = store => {
					auto_close(store.transaction);
					if(list.length === 1){
						store.transaction.db.addEventListener("close", ({target: {name}}) => {
							if(name == null) callback(name);
						});
						store.put({key: list[0]});
					}else{
						visit(store);
					}
				};
				if(name == null){
					const make = () => {
						const onsuccess = () => {
							cn.result.close();
							make();
						};
						const cn = indexedDB.open(Date.now() + Math.random().toString().slice(1));
						cn.addEventListener("success", onsuccess);
						cn.addEventListener("blocked", make);
						cn.addEventListener('upgradeneeded", () => {
							cn.removeEventListener("success", onsuccess);
							put(cn.result.createObjectStore("store", {keyPath: "key"}));
						});
					};
					make();
				}else{
					if_exist(name, ({target: {result}}) => put(result.tansaction(["store"], "readwrite").objectStore("store")), callback);
				}
			};
			f(null, name, ...format(list));
		},
	};
})();

return genfn2tick(function*(){
	for(let cancel of [...cancels].reverse()) yield cancel();
});
