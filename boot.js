const {run, hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = library;
library = Object.create(library);
const cancels = new Set;

const format_uri = uri => {
	const iframe = document.createElement("iframe");
	iframe.src = uri;
	return iframe.src;
};
library.format_uri = format_uri;

const multi_key_map = () => {
	const tree = new Map;
	const symbol = Symbol();
	return {
		set: (...args) => {
			const keys = [...args.slice(0, -1), symbol];
			const [value] = args.slice(-1);
			const f0 = (parent, ...keys) => {
				if(keys.length === 1 || parent.has(keys[0]) && f0(parent.get(keys[0]), ...keys.slice(1)) === 0){
					parent.delete(keys[0]);
					return parent.size;
				}
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
library.multi_key_map = multi_key_map;

const db = (() => {
	const hub_source = `({tickline, genfn2tick}, port) => ({
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
			if(worker) worker.port.postMessage("disconnect");
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
		return [hell0, self.eval('"use strict"; ' + hub_source)(library, tickline(() => worker.port)(hell0))];
	})();
	const name = ".";
	const end = Symbol();
	const format = list => {
		for(let i = 0, l = list.length; i < l; i += 1) if((list[i] = list[i] === end ? "end" : [list[i]]) === "end"){
			list.splice(i + 1, l);
			break;
		}
		indexedDB.cmp(list, list);
		return list;
	};
	const unformat = a => indexedDB.cmp(a, "end") === 0 ? end : a[0];
	const put_uri = (() => {
		const uri = URL.createObjectURL(new Blob([`
			"use strict";

			const library = self.eval('"use strict"; ' + unescape("${escape(library_source)}"));
			const {run, hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = library;

			const [hell0, resolve0] = hell();
			const [hell1, resolve1] = hell();
			hell0(port => {
				port.addEventListener("message", ({data}) => {
					if(data === "connected") resolve1(port);
				});
				port.start();
			});
			const hub = self.eval('"use strict"; ' + unescape("${escape(hub_source)}"))(library, hell1);

			const db_set = new Set;
			const open_db = name => {
				const symbol = Symbol();
				db_set.add(symbol);
				const cn = indexedDB.open(name);
				cn.addEventListener("success", () => {
					db_set.add(cn.result);
					db_set.delete(symbol);
				});
				return cn;
			};
			const close_db = target => {
				let canceled = false;
				if(target instanceof IDBOpenDBRequest){
					target.addEventListener("success", () => {
						if(!canceled) close_db(target.result);
					});
				}else if(target instanceof IDBTransaction){
					target.addEventListener("complete", () => {
						if(!canceled) close_db(target.db);
					});
				}else{
					db_set.delete(target);
					if(db_set.size === 0){
						hub.send(...list);
						tickline(port => {
							port.postMessage("disconnect");
							close();
						})(hell1);
					}
					return target.close();
				}
				return () => {
					canceled = true;
				};
			};

			let list;
			let length;
			const init_store = db => db.createObjectStore("store", {keyPath: "key"});
			const open_store = db => db.transaction(["store"], "readwrite").objectStore("store");
			const no_error = target => target.addEventListener("error", event => event.preventDefault());
			const abort_transaction = transaction => {
				try{
					transaction.abort();
				}catch(error){}
			};
			const end = (db, then) => {
				const store = open_store(db);
				close_db(store.transaction);
				store.openCursor().addEventListener("success", ({target: {result}}) => {
					if(result){
						result.continue();
						const name = result.value.value;
						if(name !== undefined){
							const f1 = () => end(cn.result);
							const cn = open_db(name);
							cn.addEventListener("upgradeneeded", () => {
								cn.removeEventListener("success", f1);
								init_store(cn.result);
								close_db(cn);
							});
							cn.addEventListener("success", () => indexedDB.deleteDatabase(name));
							cn.addEventListener("success", f1);
						}
					}else{
						store.clear().addEventListener("success", then);
					}
				});
			};
			const f = (i, name) => {
				i += 1;
				const put = (store, value) => store.put(value === undefined ? {key: list[i - 1]} : {key: list[i - 1], value});
				const get = (store, onsuccess) => store.get(list[i - 1]).addEventListener("success", onsuccess);
				const make = () => {
					let abort = () => {
						cn.removeEventListener("upgradeneeded", f1);
						cn.removeEventListener("success", f2);
						cn.addEventListener("upgradeneeded", () => indexedDB.deleteDatabase(cn.result.name));
					};
					const f1 = () => {
						cn.removeEventListener("success", f2);
						const {result} = cn;
						const store = init_store(result);
						const request = put(store);
						cn.transaction.addEventListener("complete", () => name(result.name));
						const abort1 = next(cancel, result);
						abort = () => {
							indexedDB.deleteDatabase(result.name);
							if(abort1) abort1();
							no_error(cn);
							no_error(request);
							abort_transaction(cn.transaction);
							close_db(result);
						};
					};
					const f2 = () => abort = make();
					const cn = open_db(Date.now() + Math.random().toString().slice(1));
					cn.addEventListener("upgradeneeded", f1);
					cn.addEventListener("success", f2);
					const cancel = close_db(cn);
					return () => {
						abort();
						abort = () => {};
					};
				}
				const next = (cancel, db) => {
					if(i < length){
						cancel();
						const hell0 = hub.on((...list1) => {
							if(list1.length > i){
								for(let j = 0; j <= i; j += 1) if(indexedDB.cmp(list[j], list1[j]) !== 0) return;
								cancel();
								abort();
								then(result => {
									if(result) f(i, result.value);
								});
							}
						});
						cancel = () => tickline(cancel => cancel())(hell0);
						const then = onresult => {
							cancel();
							const store = open_store(db);
							close_db(store.transaction);
							get(store, ({target: {result}}) => onresult(result, store));
							aborts.push(() => abort_transaction(store.transaction));
						};
						const abort = f(i, name => then((result, store) => {
							if(result){
								if(result.value === undefined){
									put(store, name);
								}else{
									f(i, result.value);
								}
							}else{
								abort();
							}
						}));
						const aborts = [() => {
							cancel();
							abort();
						}];
						return () => {
							let abort;
							no_error(db);
							while(abort = aborts.shift()) abort();
						};
					}
				};
				const f1 = () => {
					const f2 = () => store.get("end").addEventListener("success", ({target: {result}}) => {
						if(result){
							tickline(port => port.postMessage("disconnect"))(hell0);
						}else{
							if(indexedDB.cmp(list[i - 1], "end") === 0){
								put(store);
								cancel();
								store.transaction.addEventListener("complete", () => {
									hub.send(...list);
									tickline(port => port.postMessage("disconnect"))(hell1);
									end(db, ({target: {source}}) => put(source));
								});
							}else{
								get(store, ({target: {result}}) => {
									if(result && result.value !== undefined){
										if(i < length) f(i, result.value);
									}else{
										if(!result) put(store);
										next(cancel, db);
									}
								});
							}
						}
					});
					const db = cn.result;
					const store = open_store(db);
					const cancel = close_db(store.transaction);
					if(i > 1){
						store.count().addEventListener("success", ({target: {result}}) => {
							if(result > 0) f2();
						});
					}else{
						f2();
					}
				};
				if(typeof name === "function") return make();
				const cn = open_db(name);
				cn.addEventListener("upgradeneeded", () => {
					if(i > 1){
						cn.removeEventListener("success", f1);
						indexedDB.deleteDatabase(name);
						close_db(cn);
					}
					init_store(cn.result);
				});
				cn.addEventListener("success", f1);
			};

			addEventListener("message", ({data, ports: [port]}) => {
				if(port) resolve0(port);
				if(data){
					list = data.list;
					length = list.length;
					f(0, data.name);
				}
			});
			addEventListener("error", () => tickline(port => port.postMessage("disconnect"))(hell0));
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
		end,
		put: (...list) => {
			if(list.length > 0){
				let data = {name, list: format(list)};
				const worker = new Worker(put_uri);
				if(is_hell(tickline(uri => worker.postMessage(data, [new SharedWorker(uri).port]))(hub_uri))){
					worker.postMessage(data);
					data = null;
				}
			}
		},
		on: (...list) => {
			const listener = list.pop();
			if(listener){
				const f = (i, name) => {
					if(canceled) return;
					const f1 = () => {
						if(canceled) return cn.result.close();
						const store = cn.result.transaction(["store"], "readonly").objectStore("store");
						store.transaction.addEventListener("complete", () => cn.result.close());
						store.get("end").addEventListener("success", ({target: {result}}) => {
							if(canceled) return;
							if(result){
								if(i === length){
									run(() => () => listener(end));
								}else if(i === length - 1 && indexedDB.cmp(list[i], "end") === 0){
									run(() => listener);
								}
							}else{
								if(i === length){
									store.openKeyCursor(null, "prev").addEventListener("success", ({target: {result}}) => {
										if(result && !canceled){
											result.continue();
											run(() => () => listener(unformat(result.key)));
										}
									});
								}else{
									store.get(list[i]).addEventListener("success", ({target: {result}}) => {
										if(result && !canceled){
											if(i === length - 1 && indexedDB.cmp(list[i], result.key) === 0) run(() => listener);
											if(result.value !== undefined) f(i + 1, result.value);
										}
									});
								}
							}
						});
					};
					const cn = indexedDB.open(name);
					cn.addEventListener("success", f1);
					cn.addEventListener("upgradeneeded", () => {
						cn.removeEventListener("success", f1);
						cn.addEventListener("success", () => cn.result.close());
						cn.result.createObjectStore("store", {keyPath: "key"});
						if(i > 0) indexedDB.deleteDatabase(name);
					});
				};
				list = format(list);
				const length = list.length;
				const cancel = hub.on((...list1) => {
					if(list1.length >= length && list.every((a, i) => indexedDB.cmp(a, list1[i]) === 0)){
						if(list1.length > length){
							run(() => () => listener(unformat(list1[length])));
						}else{
							run(() => listener);
						}
					}
				});
				let canceled = false;
				tickline(() => f(0, name))(cancel);
				return () => {
					canceled = true;
					tickline(cancel => cancel())(cancel);
				};
			}
			return () => {};
		},
	};
})();
library.db = db;

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
library.tube = tube;

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
							run(() => thunk);
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
library.tubeline = tubeline;

const ajax = (() => {
	const ajax = (uri, ...range) => {
		//if(!storage.has(uri)
	};
	const storage = new Map;
	return tubeline((uri, ...range) => listener => {
		if(listener) listener(format_uri(uri), ...range);
	}, ajax);
})();

self.library = library;

return genfn2tick(function*(){
	for(let cancel of [...cancels].reverse()) yield cancel();
});
