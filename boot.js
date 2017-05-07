const {run, hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = library;
library = Object.create(library);
const cancels = new Set;

const format_uri = uri => {
	const iframe = document.createElement("iframe");
	iframe.src = uri;
	return iframe.src;
};
library.format_uri = format_uri;

const cache = f => {
	let args;
	let result;
	return (...args1) => {
		if(args && args.length === args1.length && args1.every((arg, i) => arg === args[i])) return result;
		result = f(...args1);
		args = args1;
		return result;
	};
};
library.cache = cache;

const clone = source => {
	if(source === null || new Set(["undefined", "boolean", "number", "string"]).has(typeof source)) return source;
	const [hell0, resolve] = hell();
	const {port1, port2: port0} = new MessageChannel;
	port1.addEventListener("message", ({data}) => resolve(data));
	port1.start();
	port0.start();
	port0.postMessage(source);
	return hell0;
};
library.clone = clone;

const clone_list = genfn2tick(function*(list){
	list = list.map(a => clone(a));
	for(let i = list.length - 1; i >= 0; i -= 1) list[i] = yield clone(list[i]);
	return list;
});
library.clone_list = clone_list;

const roll = poll => {
	let cancel;
	return (interval = Infinity, offset = interval) => {
		(cancel || (() => {}))();
		const timer = setTimeout(() => {
			const timer = setInterval(poll, interval);
			cancel = () => clearInterval(timer);
			poll();
		}, interval - offset);
		cancel = () => clearTimeout(timer);
	};
};
library.roll = roll;

const multi_key_map = () => {
	const tree = new Map;
	const symbol = Symbol();
	return {
		set: (...args) => {
			const keys = [...args.slice(0, -1), symbol];
			const [value] = args.slice(-1);
			const f0 = (parent, ...keys) => {
				if(keys.length > 1 && (!parent.has(keys[0]) || f0(parent.get(keys[0]), ...keys.slice(1)) !== 0)) return;
				parent.delete(keys[0]);
				return parent.size;
			};
			const f1 = (parent, ...keys) => {
				if(keys.length > 1){
					if(!parent.has(keys[0])) parent.set(keys[0], new Map);
					return f1(parent.get(keys[0]), ...keys.slice(1));
				}
				parent.set(keys[0], value);
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
		const [hell0, resolve] = hell();
		const connect = () => {
			worker = new SharedWorker(uri);
			worker.port.addEventListener("message", ({data}) => {
				if(data !== "connected") return;
				worker.removeEventListener("error", onerror);
				resolve(uri);
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

			const dbs = new Set;
			const open_db = name => {
				const symbol = Symbol();
				dbs.add(symbol);
				const cn = indexedDB.open(name);
				cn.addEventListener("success", () => {
					dbs.add(cn.result);
					dbs.delete(symbol);
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
					dbs.delete(target);
					if(dbs.size === 0){
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
						return result.continue();
					}
					store.clear().addEventListener("success", then);
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
					if(i === length) return;
					cancel();
					const hell0 = hub.on((...list1) => {
						if(list1.length <= i) return;
						for(let j = 0; j <= i; j += 1) if(indexedDB.cmp(list[j], list1[j]) !== 0) return;
						cancel();
						abort();
						then(result => {
							if(result) f(i, result.value);
						});
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
							if(result.value === undefined) return put(store, name);
							return f(i, result.value);
						}
						abort();
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
				};
				const f1 = () => {
					const f2 = () => store.get("end").addEventListener("success", ({target: {result}}) => {
						if(result) return tickline(port => port.postMessage("disconnect"))(hell0);
						if(indexedDB.cmp(list[i - 1], "end") === 0){
							put(store);
							cancel();
							return store.transaction.addEventListener("complete", () => {
								hub.send(...list);
								tickline(port => port.postMessage("disconnect"))(hell1);
								end(db, ({target: {source}}) => put(source));
							});
						}
						get(store, ({target: {result}}) => {
							if(!result || result.value === undefined){
								if(!result) put(store);
								return next(cancel, db);
							}
							if(i < length) f(i, result.value);
						});
					});
					const db = cn.result;
					const store = open_store(db);
					const cancel = close_db(store.transaction);
					if(i > 1) return store.count().addEventListener("success", ({target: {result}}) => {
						if(result > 0) f2();
					});
					f2();
				};
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

			addEventListener("message", ({data, ports: [port]}) => {
				if(port) resolve0(port);
				if(!data) return;
				list = data.list;
				length = list.length;
				f(0, data.name);
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
			if(!list.length) return;
			let data = {name, list: format(list)};
			const worker = new Worker(put_uri);
			if(!is_hell(tickline(uri => worker.postMessage(data, [new SharedWorker(uri).port]))(hub_uri))) return;
			worker.postMessage(data);
			data = null;
		},
		on: (...list) => {
			const listener = list.pop();
			if(!listener) return () => {};
			const f = (i, name) => {
				if(canceled) return;
				const f1 = () => {
					if(canceled) return cn.result.close();
					const store = cn.result.transaction(["store"], "readonly").objectStore("store");
					store.transaction.addEventListener("complete", () => cn.result.close());
					store.get("end").addEventListener("success", ({target: {result}}) => {
						if(canceled) return;
						if(result){
							if(i === length) return run(() => () => listener(end));
							if(i === length - 1 && indexedDB.cmp(list[i], "end") === 0) run(() => listener);
							return;
						}
						if(i < length) return store.get(list[i]).addEventListener("success", ({target: {result}}) => {
							if(!result || canceled) return;
							if(i === length - 1 && indexedDB.cmp(list[i], result.key) === 0) run(() => listener);
							if(result.value !== undefined) f(i + 1, result.value);
						});
						store.openKeyCursor(null, "prev").addEventListener("success", ({target: {result}}) => {
							if(!result || canceled) return;
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
			let cancel;
			let canceled = false;
			genfn2tick(function*(){
				list = yield clone_list(format(list));
				if(canceled) return;
				const length = list.length;
				cancel = hub.on(genfn2tick(function*(...list1){
					if(list1.length < length || !list.every((a, i) => indexedDB.cmp(a, list1[i]) === 0)) return;
					if(list1.length > length){
						const a = yield clone(unformat(list1[length]));
						if(canceled) return;
						return run(() => () => listener(a));
					}
					run(() => listener);
				}));
				yield cancel;
				f(0, name);
			})();
			return () => {
				canceled = true;
				if(cancel) tickline(cancel => cancel())(cancel);
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
						if(yield hell0 || args.length > 0) (yield hell0)(...args);
					}),
					handle_num: 1,
					listener_num: 0,
					pool: new Set,
				};
				states.set(...condition, state);
				resolve(source(...condition));
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
					const update = () => {
						if(!solution1 || solution.length !== solution1.length || !solution1.every((a, i) => a === solution[i])){
							lock = true;
							return genfn2tick(function*(){
								const [hell0, resolve] = hell();
								setTimeout(resolve);
								yield (cancel || (() => {}))();
								solution1 = solution;	
								cancel = listener(...solution1);
								yield hell0;
								update();
							})();
						}
						lock = false;
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
						if(used) return;
						used = true;
						const hell0 = cancel();
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
						yield hell0;
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
						for(let thunk of state.pool) return thunk(listener);
						const [hell0, resolve] = hell();
						let timer = setTimeout(() => {
							timer = null;
							for(let thunk of state.pool) return resolve(thunk(listener));
							resolve(listen(listener));
						});
						return () => {
							if(timer) return clearTimeout(timer);
							hell0(thunk => thunk());
						};
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
						cancels.set(listener, () => {
							cancels.delete(listener);
							run(() => thunk);
						});
						const thunk = thunk1(listener);
					};
					const listeners = new Set;
					const cancels = new Map;
					const thunk0 = tubes[0](...condition)((...args) => {
						thunk1 = tubes[1](...args);
						[...listeners].forEach(listener => listen(listener));
						return () => {
							thunk1 = null;
							cancels.forEach(cancel => cancel());
						};
					});
					let thunk1;
					return listener => {
						if(listener){
							listeners.add(listener);
							if(thunk1) listen(listener);
							return () => {
								listeners.delete(listener);
								cancels.get(listener)();
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

const _ajax = (listener, uri, tag, from = 0, to = null) => {
	const xhr = (piped, from, to) => {
		const xhr0 = new XMLHttpRequest;
		if(piped){
			xhr0.overrideMimeType("text/plain; charset=x-user-defined");
		}else{
			xhr0.responseType = "arraybuffer";
		}
		xhr0.open('GET', uri);
		if(tag) xhr0.setRequestHeader(...tag);
		xhr0.setRequestHeader("Cache-Control", "max-age=0");
		xhr0.setRequestHeader("Range", "bytes=" + from + (to === null ? "" : "-" + to));
		return xhr0;
	};
	uri = format_uri(uri);
	const xhr0 = xhr(true, from, to);
	
};

const ajax = (() => {
	const path = ["cache"];
	const f = x => {
		x /= 1e3;
		x = (Math.max(0, (Math.log(x / 10 + 1.4) - Math.log(1.5)) ** 1.2 * 16) || 0) + (x / 50) ** 0.8;
		return x * 1e3;
	};
	const dir = (() => {
		const dir = path => (...path1) => {
			let cancel;
			let canceled = false;
			const listener = path1.pop();
			path1 = clone_list(path1);
			genfn2tick(function*(){
				path = (yield path).concat(yield path1);
				if(canceled) return;
				cancel = db.on(...path, (...path1) => listener(dir(tickline(path1 => path.concat(path1))(clone_list(path1))), ...path1));
			})();
			return () => {
				canceled = true;
				if(cancel) cancel();
			};
		};
		return dir(path);
	})();
	const pointlist = (mode, ...movelist) => {
		let n = 0;
		let pos = [];
		const result = [];
		movelist.sort(([mode0, pos0], [mode1, pos1]) => pos0 - pos1).forEach(([mode1, pos1]) => {
			if(n > 0){
				if(mode ^ mode1){
					n -= 1;
					return pos = [pos1];
				}
				return n += 1;
			}
			if(pos1 > pos[0] || mode ^ mode1) result.push(...pos, pos1);
			mode = mode1;
			n = 1;
		});
		if(n === 0) result.push(...pos);
		return result;
	};
	const movelist = (mode, ...pointlist) => pointlist.map(pos => [mode = !mode, pos]);
	const mix = (a, b, mode0, mode1, mode2) => pointlist(mode0, ...movelist(mode1, ...a).concat(movelist(mode2, ...b)));

	const counts = multi_key_map();
	const states = new Map;
	const assign = tube(uri => {
		const count = () => counts.set(uri, (counts.get(uri) || 0) + 1);
		const uncount = () => counts.set(uri, counts.get(uri) - 1 || undefined);
		const connect = () => {
			const state = states.get(uri);
			if(state) request(state, ((state.edition || {pointlist1: () => []}).pointlist1()[0] + 1 || state.pointlist[0] + 1 || 1) - 1);
		};
		const request = () => tickline(uncount)(genfn2tick(function*(){
			const update = (date, tag) => {
				if(state.update(date, tag) === state.date1) state.roll(f(state.date1 - state.date0), performance.now() - stamp);
			};
			const stamp = performance.now();
			count();
			let state = states.get(uri);
			if(!state) return;
			const edition = state.edition;
			const point = edition && edition.pointlist1()[0];
			const headers = [
				["Cache-Control", "max-age=0"],
				["Range", "bytes=" + (point == null ? state.pointlist[0] || 0 : point) + "-"],
				...edition && point == null ? [[new Map([
					["ETag", "If-Match"],
					["Last-Modified", "If-Unmodified-Since"],
				]).get(edition.tag[0]), edition.tag[1]]] : [],
			];
			if("body" in Response.prototype){
				const init = {headers: new Headers()};
				headers.forEach(header => init.headers.set(...header));
				const [error, response] = yield prom2tick(fetch(uri, init));
				state = states.get(uri);
				if(response){
					const reader = response.body.getReader();
					if(state){
						const headers = response.headers;
						const date = headers.get("Date");
						if(response.status === 404) return update(date);
						if(response.status === 304){
							update(date, t);
							if(indexedDB.cmp(t, ((t = state.edition) || {tag: 0}).tag) === 0 && t.pointlist1().length > 0){
							}
						}
						const tag =
							(t = headers.get("ETag")) === null
							? (t = headers.get("Last-Modified")) === null
							? null
							: ["If-Modified-Since", t]
							: ["If-None-Match", t];
						const cn = {
							begin,
							end: +String(headers.get("Content-Length")),
							progress: 0,
							abort: () => reader.cancel(),
						};
						if(response.status === 206){
							const match = 
						}
					}
					reader.cancel();
				}
				connect();
				return;
			}
		})());
		const get_edition = (() => {
			const editions = multi_key_map();
			return tag => editions.get(...tag) || (() => {
				tags.push(tag);
				const f = cache(() => {
					return mix(mix(state.pointlist, edition.pointlist0, false, false, false), edition.pointlist0, false, false, true);
				});
				const edition = {
					tag,
					date: -Infinity,
					pointlist0: [],
					pointlist1: () => f(...state.pointlist, null, ...edition.pointlist0),
					records: [],
					mtime: new Date(NaN),
				};
				editions.set(...tag, edition);
				return edition;
			})();
		})();
		const update = (date, tag) => {
			date = +new Date(String(date));
			date = Number.isNaN(date) ? -Infinity : date;
			if(date > state.date1){
				state.date1 = date;
				const edition = state.edition;
				if(tag){
					(state.edition = get_edition(tag)).date = date;
				}else{
					state.edition = null;
					listeners.forEach(listener => listener());
				}
				if(edition !== state.edition){
					pool.forEach(cn => cn.abort());
					pool.clear();
					if(Number.isNaN(state.date0)){
						state.date0 = date - 7e3;
					}else{
						state.date0 = date;
						request();
					}
				}
			}
			return date;
		};
		const poll = offset => {
			clearTimeout(timer);
			timer = setTimeout(request, f(state.date1 - state.date0) - offset);
		};
		const pointlists = new Set;
		const tags = [];
		const listeners = new Set;
		const pool = new Set;
		let timer;
		const state = {
			pool,
			edition: null,
			pointlist: [],
			date0: NaN,
			date1: -Infinity,
			update,
			poll,
		};
		states.set(uri, state);
		return listener => {
			states.delete(uri);
		};
	});
	const ajax = tube((uri, ...pointlist) => {
		let point = 0;
		pointlist = pointlist.map(d => {
			if(!(d >= 0)) throw new TypeError;
			point += Math.floor(d);
			return point;
		});
		const [hell0, resolve] = resolve();
		const cancel = assign(uri)(arrange => resolve(arrange(...pointlist)));
		return listener => {
			if(listener){
				const cancel = tickline(arrange => arrange(listener))(hell0);
				return () => tickline(cancel => cancel())(cancel);
			}
			tickline(arrange => arrange())(hell0);
			cancel();
		};
	});
	return tube((uri, ...rest) => listener => {
		if(listener) listener(format_uri(uri), ...rest);
	}, ajax);
})();

self.library = library;

return genfn2tick(function*(){
	for(let cancel of [...cancels].reverse()) yield cancel();
});
