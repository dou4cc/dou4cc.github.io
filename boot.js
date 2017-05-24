﻿const {run, hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = library;
library = Object.create(library);
const cancels = new Set;

const format_uri = uri => {
	const iframe = document.createElement("iframe");
	iframe.src = uri;
	return iframe.src;
};
library.format_uri = format_uri;

const same_list = (a, b) => a && a.length === b.length && a.every((x, i) => x === b[i] || Object.is(x, b[i]));
library.same_list = same_list;

const cache = f => {
	let args;
	let result;
	return (...args1) => {
		if(same_list(args, args1)) return result;
		result = f(...args1);
		args = args1;
		return result;
	};
};
library.cache = cache;

const clone = source => {
	if(source == null || new Set(["boolean", "number", "string", "symbol"]).has(typeof source)) return source;
	const [hell0, resolve] = hell();
	const {port1, port2} = new MessageChannel;
	port1.addEventListener("message", ({data}) => resolve(data));
	port1.start();
	port2.start();
	port2.postMessage(source);
	return hell0;
};
library.clone = clone;

const clone_list = genfn2tick(function*(list){
	list = list.map(a => clone(a));
	for(let i = list.length - 1; i >= 0; i -= 1) list[i] = yield list[i];
	return list;
});
library.clone_list = clone_list;

const multi_key_map = () => {
	const dot = new Map;
	const f = (node, keys) => node && keys.length > 0 ? f(node.get(keys.shift()), keys) : node;
	return {
		set: (...keys) => {
			const [value] = keys.splice(-1, 1, dot);
			const f = parent => {
				const key = keys.shift();
				if(value === undefined){
					if(key !== dot){
						const child = parent.get(key);
						if(!child || !f(child)) return;
					}
					parent.delete(key);
					return parent.size === 0;
				}
				if(key !== dot) return f(parent.get(key) || (() => {
					const child = new Map;
					parent.set(key, child);
					return child;
				})());
				parent.set(key, value);
			};
			f(dot);
		},
		get: (...keys) => f(dot, keys.concat(dot)),
	};
};
library.multi_key_map = multi_key_map;

const db = (() => {
	const format = list => {
		for(let i = 0; i < list.length; i += 1) if((list[i] = list[i] === end ? "end" : [list[i]]) === "end"){
			list.splice(i + 1, list.length);
			break;
		}
		indexedDB.cmp(list, list);
		return list;
	};
	const unformat = a => indexedDB.cmp(a, "end") === 0 ? end : a[0];
	const name = ".";
	const end = Symbol();
	const hub_source = `({tickline}, port) => ({
		send: (...list) => tickline(port => port.postMessage(list))(port),
		on: listener => tickline(port => {
			const onmessage = ({data}) => data instanceof Array && listener(...data);
			port.addEventListener("message", onmessage);
			return () => port.removeEventListener("message", onmessage);
		})(port),
	})`;
	const [hub_uri, hub] = (() => {
		const onunload = () => worker && worker.port.postMessage("disconnect");
		const make = () => {
			uri = URL.createObjectURL(new Blob([`"use strict";
				const ports = new Set;
				addEventListener("connect", event => event.ports.forEach(port => {
					ports.add(port);
					port.addEventListener("message", ({data}) => {
						if(data instanceof Array) return ports.forEach(port => port.postMessage(data));
						if(data !== "disconnect") return;
						port.close();
						ports.delete(port);
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
				if(data !== "connected") return;
				worker.removeEventListener("error", onerror);
				resolve(uri);
			});
			worker.port.start();
		};
		const key = "hub-uri";
		let worker;
		addEventListener("unload", onunload);
		let uri = sessionStorage.getItem(key);
		const [hell0, resolve] = hell();
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
		return [hell0, self.eval('"use strict";' + hub_source)(library, tickline(() => worker.port)(hell0))];
	})();
	const put_uri = (() => {
		const onunload = () => URL.revokeObjectURL(uri);
		const uri = URL.createObjectURL(new Blob([`"use strict";
			const {hell, tickline} = self.eval('"use strict";' + unescape("${escape(library_source)}"));

			const open_db = name => {
				const cn = indexedDB.open(name);
				dbs.add(cn);
				cn.addEventListener("success", () => {
					dbs.add(cn.result);
					dbs.delete(cn);
				});
				return cn;
			};
			const close_db = target => {
				let canceled = false;
				if(target instanceof IDBOpenDBRequest){
					target.addEventListener("success", () => canceled || close_db(target.result));
				}else if(target instanceof IDBTransaction){
					target.addEventListener("complete", () => canceled || close_db(target.db));
				}else{
					target.close();
					dbs.delete(target);
					if(dbs.size > 0) return;
					hub.send(...list);
					tickline(port => {
						port.postMessage("disconnect");
						close();
					})(hell1);
				}
				return () => canceled = true;
			};
			const init_store = db => db.createObjectStore("store", {keyPath: "key"});
			const open_store = db => db.transaction(["store"], "readwrite").objectStore("store");
			const no_error = target => target.addEventListener("error", event => event.preventDefault());
			const abort_transaction = ({transaction}) => {
				try{
					transaction.abort();
				}catch(error){}
			};
			const end = (db, then) => {
				const store = open_store(db);
				close_db(store.transaction);
				store.openCursor().addEventListener("success", ({target: {result}}) => {
					const f = () => end(cn.result);
					if(!result) return store.clear().addEventListener("success", then);
					result.continue();
					const {value} = result.value;
					if(!value) return;
					const cn = open_db(value);
					cn.addEventListener("upgradeneeded", () => {
						cn.removeEventListener("success", f);
						init_store(cn.result);
						close_db(cn);
					});
					cn.addEventListener("success", () => indexedDB.deleteDatabase(value));
					cn.addEventListener("success", f);
				});
			};
			const f = (i, name) => {
				const put = (store, value) => store.put(value ? {key, value} : {key});
				const get = (store, then) => store.get(key).addEventListener("success", then);
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
						cn.transaction.addEventListener("complete", () => name(result));
						const abort1 = next(cancel, result);
						abort = () => {
							indexedDB.deleteDatabase(result.name);
							if(abort1) abort1();
							no_error(cn);
							no_error(request);
							abort_transaction(cn);
							close_db(result);
						};
					};
					const f2 = () => abort = make();
					const cn = open_db("" + Date.now() + Math.random());
					cn.addEventListener("upgradeneeded", f1);
					cn.addEventListener("success", f2);
					const cancel = close_db(cn);
					return () => {
						abort();
						abort = () => {};
					};
				}
				const next = (cancel, db) => {
					const then = then => {
						cancel();
						const store = open_store(db);
						close_db(store.transaction);
						get(store, ({target: {result}}) => then(result, store));
						aborts.push(() => abort_transaction(store));
					};
					if(i === length) return;
					const abort = f(i, ({name}) => then((result, store) => {
						if(!result) return abort();
						if(result.value) return f(i, result.value);
						put(store, name);
					}));
					cancel();
					cancel = () => tickline(cancel => cancel())(tick);
					const aborts = [cancel, abort];
					const tick = hub.on((...list1) => {
						if(list1.length <= i) return;
						for(let j = i; j >= 0; j -= 1) if(indexedDB.cmp(list[j], list1[j]) !== 0) return;
						abort();
						then(result => result && f(i, result.value));
					});
					return () => {
						no_error(db);
						aborts.forEach(f => f());
						aborts.length = 0;
					};
				};
				const f1 = () => {
					const f2 = () => store.get("end").addEventListener("success", ({target: {result}}) => {
						if(result) return tickline(port => port.postMessage("disconnect"))(hell0);
						if(indexedDB.cmp(key, "end") !== 0) return get(store, ({target: {result}}) => {
							if(!result || !result.value){
								if(!result) put(store);
								return next(cancel, db);
							}
							if(i < length) f(i, result.value);
						});
						put(store);
						cancel();
						store.transaction.addEventListener("complete", () => {
							hub.send(...list);
							tickline(port => port.postMessage("disconnect"))(hell1);
							end(db, ({target: {source}}) => put(source));
						});
					});
					const db = cn.result;
					const store = open_store(db);
					const cancel = close_db(store.transaction);
					if(i === 1) return f2();
					store.count().addEventListener("success", ({target: {result}}) => result > 0 && f2());
				};
				const key = list[i];
				i += 1;
				if(typeof name === "function") return make();
				const cn = open_db(name);
				cn.addEventListener("upgradeneeded", () => {
					init_store(cn.result);
					if(i === 1) return;
					cn.removeEventListener("success", f1);
					indexedDB.deleteDatabase(name);
					close_db(cn);
				});
				cn.addEventListener("success", f1);
			};

			const [hell0, resolve0] = hell();
			const [hell1, resolve1] = hell();
			hell0(port => {
				port.addEventListener("message", ({data}) => data === "connected" && resolve1(port));
				port.start();
			});
			const hub = self.eval('"use strict";' + unescape("${escape(hub_source)}"))({tickline}, hell1);
			const dbs = new Set;
			let list;
			let length;
			addEventListener("message", ({data, ports}) => {
				if(ports[0]) resolve0(ports[0]);
				if(!data) return;
				({length} = list = data);
				f(0, unescape("${escape(name)}"));
			});
			addEventListener("error", () => tickline(port => port.postMessage("disconnect"))(hell0));
		`], {type: "text/javascript"}));
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
			if(list.length === 0) return;
			list = format(list);
			const worker = new Worker(put_uri);
			if(!is_hell(tickline(uri => worker.postMessage(list, [new SharedWorker(uri).port]))(hub_uri))) return;
			worker.postMessage(list);
			list = null;
		},
		on: (...list) => {
			const f = (i, name) => {
				if(cancel === null) return;
				const f1 = () => {
					if(cancel === null) return cn.result.close();
					const store = cn.result.transaction(["store"], "readonly").objectStore("store");
					store.transaction.addEventListener("complete", () => cn.result.close());
					store.get("end").addEventListener("success", ({target: {result}}) => {
						if(cancel === null) return;
						if(result){
							if(i === length) return run(() => () => listener(end));
							if(i === length - 1 && indexedDB.cmp(list[i], "end") === 0) run(() => listener);
							return;
						}
						if(i < length) return store.get(list[i]).addEventListener("success", ({target: {result}}) => {
							if(!result || cancel === null) return;
							if(i === length - 1 && indexedDB.cmp(list[i], result.key) === 0) run(() => listener);
							if(result.value) f(i + 1, result.value);
						});
						store.openKeyCursor(null, "prev").addEventListener("success", ({target: {result}}) => {
							if(!result || cancel === null) return;
							result.continue();
							run(() => () => listener(unformat(result.key)));
						});
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
			const listener = list.pop();
			if(!listener) return () => {};
			let length;
			let cancel;
			genfn2tick(function*(){
				list = format(yield clone_list(list));
				if(cancel === null) return;
				({length} = list);
				cancel = hub.on(genfn2tick(function*(...list1){
					if(list1.length < length || !list.every((a, i) => indexedDB.cmp(a, list1[i]) === 0)) return;
					if(list1.length > length){
						const a = yield clone(unformat(list1[length]));
						if(cancel === null) return;
						return run(() => () => listener(a));
					}
					run(() => listener);
				}));
				yield cancel;
				f(0, name);
			})();
			return () => {
				if(cancel) tickline(f => f())(cancel);
				cancel = null;
			};
		},
	};
})();
library.db = db;

const tube = (() => {
	const dp = new WeakMap;
	return source => dp.get(source) || (() => {
		const states = multi_key_map();
		const tube0 = (...condition) => {
			const sync = () => {
				state = states.get(...condition);
				if(state) return state.handle_num += 1;
				const [hell0, resolve] = hell();
				state = {
					alive: true,
					thunk: genfn2tick(function*(...args){
						if(yield hell0 || args.length > 0) return (yield hell0)(...args);
					}),
					handle_num: 1,
					listener_num: 0,
					pool: new Set,
				};
				states.set(...condition, state);
				run(() => () => resolve(source(...condition)));
			};
			const unsync = () => {
				state.handle_num -= 1;
				if(state.handle_num > 0) return;
				state.alive = false;
				states.set(...condition, undefined);
				state.thunk();
			};
			const listen = listener => {
				const f0 = listener => {
					const update = genfn2tick(function*(){
						if(same_list(solution1, solution)) return lock = false;
						lock = true;
						const [hell0, resolve] = hell();
						setTimeout(resolve);
						yield (cancel || (() => {}))();
						solution1 = solution;
						try{
							cancel = listener(...solution);
						}catch(error){
							cancel = hell()[0];
						}
						yield hell0;
						update();
					});
					let lock = false;
					let cancel;
					let solution1;
					return [
						(...solution1) => {
							solution = solution1;
							if(!lock) update();
						},
						() => {
							if(!solution) return;
							const [hell0] = [, listener] = hell();
							solution1 = null;
							if(!lock) update();
							return hell0;
						},
					];
				};
				const f1 = used => genfn2tick(function*(){
					if(used) return;
					used = true;
					const tick = cancel();
					const listen = listener1 => {
						clearTimeout(timer);
						state.pool.delete(listen);
						[listener, cancel] = f0(listener1);
						if(solution) listener(...solution);
						return f1();
					};
					state.pool.add(listen);
					const timer = setTimeout(genfn2tick(function*(){
						state.pool.delete(listen);
						state.listener_num -= 1;
						yield (yield thunk || (() => {}))();
						listener_num -= 1;
						if(listener_num === 0) unsync();
					}));
					yield tick;
				});
				used = true;
				listener_num += 1;
				state.listener_num += 1;
				let solution;
				let [, cancel] = [listener] = f0(listener);
				const thunk = state.thunk((...solution) => listener(...solution));
				return f1();
			};
			let state;
			let used = false;
			let listener_num = 0;
			sync();
			return listener => {
				if(listener){
					if(!state.alive) sync();
					if(state.listener_num > 0){
						for(let thunk of state.pool) return thunk(listener);
						const [hell0, resolve] = hell();
						let timer = setTimeout(() => {
							timer = 0;
							for(let thunk of state.pool) return resolve(thunk(listener));
							resolve(listen(listener));
						});
						return genfn2tick(function*(){
							if(timer) return clearTimeout(timer);
							yield (yield hell0)();
						});
					}
					return listen(listener);
				}
				setTimeout(() => {
					if(used) return;
					used = true;
					unsync();
				});
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
				return tube((...args) => listener => listener && listener(...args));
			case 1:
				return dp.get(tubes[0]) || (() => {
					const solutions = [];
					const cmp = ([a], [b]) => a - b;
					const tube0 = tube((...condition) => {
						const thunk = tube(tubes[0])(...condition);
						return listener => {
							if(!listener) return thunk();
							let used = false;
							const thunk1 = thunk((...solution) => {
								used = true;
								listener(performance.now(), ...solution);
							});
							if(!used && solutions.length > 0) listener(...solutions.pop());
							return thunk1;
						};
					});
					return tube((...condition) => {
						const thunk = tube0(...condition);
						return listener => {
							if(listener) return thunk((stamp, ...solution) => {
								listener(...solution);
								return () => {
									solutions.push([stamp, ...solution]);
									solutions.sort(cmp);
								};
							});
							thunk();
						};
					});
				})();
			case 2:
				tubes = tubes.map(tube0 => tubeline(tube0));
				return tube((...condition) => {
					const listen = listener => {
						cancels.set(listener, () => {
							cancels.delete(listener);
							run(() => thunk);
						});
						const thunk = thunk0(listener);
					};
					let thunk0;
					const listeners = new Set;
					const cancels = new Map;
					const thunk1 = tubes[0](...condition)((...args) => {
						thunk0 = tubes[1](...args);
						[...listeners].forEach(listen);
						return () => {
							thunk0 = null;
							cancels.forEach(f => f());
						};
					});
					return listener => {
						if(!listener) return thunk1();
						listeners.add(listener);
						if(thunk0) listen(listener);
						return () => {
							listeners.delete(listener);
							cancels.get(listener)();
						};
					};
				});
			}
			return tubeline(tubes.shift(), tubeline(...tubes));
		})();
		dp.set(tubeline0, tubeline0);
		return tubeline0;
	};
})();
library.tubeline = tubeline;

self.library = library;

return genfn2tick(function*(){
	for(let cancel of [...cancels].reverse()) yield cancel();
});
