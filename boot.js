const {run, hell, is_hell, tickline, gen2tick, genfn2tick, same_list, cache, prom2hell} = library;
library = Object.create(library);
const cancels = new Set([() => canceled = true]);
let canceled = false;

const cmp = ([a], [b]) => a - b;

const format_url = library.format_url = url => {
	const iframe = document.createElement("iframe");
	iframe.src = url;
	return iframe.src;
};

const clone = library.clone = source => {
	if(source == null || new Set(["boolean", "number", "string"]).has(typeof source)) return source;
	const [hell0, resolve] = hell();
	const {port1, port2} = new MessageChannel;
	port1.addEventListener("message", ({data}) => resolve(data));
	port1.start();
	port2.start();
	port2.postMessage(source);
	return hell0;
};

const clone_list = library.clone_list = genfn2tick(function*(list){
	list = list.map(a => clone(a));
	for(let i = list.length - 1; i >= 0; i -= 1) list[i] = yield list[i];
	return list;
});

const multi_key_map = library.multi_key_map = () => {
	const dot = new Map;
	const f = (node, keys) => node && keys.length ? f(node.get(keys.shift()), keys) : node;
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
					return !parent.size;
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

const local_db = library.local_db = (() => {
	const format = list => {
		list = list.map(a => a === null ? "end" : [a]);
		indexedDB.cmp(list, list);
		for(let i = 0; i < list.length; i += 1) if(list[i] === "end") return list.slice(0, i + 1);
		return list;
	};
	const unformat = a => indexedDB.cmp(a, "end") ? a[0] : null;
	const put = list => {
		if(!list.length || canceled) return;
		list = format(list);
		const worker = new Worker(put_url);
		if(!is_hell(tickline(url => worker.postMessage(list, [new SharedWorker(url).port]))(hub_url))) return;
		worker.postMessage(list);
		list = null;
	};
	const db = cache(path => ({
		path: (...path1) => {
			format(path1);
			return db(tickline(path1 => tickline(path => path.concat(path1))(path))(clone_list(path1)));
		},
		put: (...path1) => {
			path = tickline()(path);
			if(!is_hell(path)) return put(path.concat(path1));
			if(path1.length) return db(path).path(...path1).put();
			tickline(path => put(path))(path);
		},
		on: listener => {
			const f = (i, name) => {
				if(cancel === null || canceled) return;
				const f1 = () => {
					if(cancel === null) return cn.result.close();
					const store = cn.result.transaction(["store"], "readonly").objectStore("store");
					store.transaction.addEventListener("complete", () => cn.result.close());
					store.get("end").addEventListener("success", ({target: {result}}) => {
						if(cancel === null) return;
						if(result){
							if(i === length) return run(() => () => listener(null, db(path).path(null)));
							if(i === length - 1 && !indexedDB.cmp(list[i], "end")) run(() => listener);
							return;
						}
						if(i < length) return store.get(list[i]).addEventListener("success", ({target: {result}}) => {
							if(!result || cancel === null) return;
							if(i === length - 1 && !indexedDB.cmp(list[i], result.key)) run(() => listener);
							if(result.value) f(i + 1, result.value);
						});
						store.openKeyCursor(null, "prev").addEventListener("success", ({target: {result}}) => {
							if(!result || cancel === null) return;
							result.continue();
							const a = unformat(result.key);
							run(() => () => listener(a, db(path).path(a)));
						});
					});
				};
				const cn = indexedDB.open(name);
				cn.addEventListener("success", f1);
				cn.addEventListener("upgradeneeded", () => {
					cn.removeEventListener("success", f1);
					cn.addEventListener("success", () => cn.result.close());
					cn.result.createObjectStore("store", {keyPath: "key"});
					if(i) indexedDB.deleteDatabase(name);
				});
			};
			let length;
			let cancel;
			let list;
			genfn2tick(function*(){
				list = format(yield path);
				if(cancel === null) return;
				({length} = list);
				cancel = hub.on(genfn2tick(function*(list1){
					if(list1.length < length || list.some((a, i) => indexedDB.cmp(a, list1[i]))) return;
					if(list1.length === length) return run(() => listener);
					let a = unformat(list1[length]);
					const db0 = db(path.concat([a]));
					a = yield clone(a);
					if(cancel) run(() => () => listener(a, db0));
				}));
				yield cancel;
				f(0, name);
			})();
			return () => {
				if(cancel) tickline(f => f())(cancel);
				cancel = null;
			};
		},
	}));
	const name = ".";
	const hub_source = `({tickline}, port) => ({
		send: list => tickline(port => port.postMessage(list))(port),
		on: listener => tickline(port => {
			const onmessage = ({data}) => data instanceof Array && listener(data);
			port.addEventListener("message", onmessage);
			return () => port.removeEventListener("message", onmessage);
		})(port),
	})`;
	const [hub_url, hub] = (() => {
		const onunload = () => worker && worker.port.postMessage("disconnect");
		const make = () => {
			url = URL.createObjectURL(new Blob([`"use strict";
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
			sessionStorage.setItem(key, url);
		};
		const onerror = () => {
			worker.removeEventListener("error", onerror);
			if(url === (url = sessionStorage.getItem(key))) make();
			connect();
		};
		const connect = () => {
			worker = new SharedWorker(url);
			worker.port.addEventListener("message", ({data}) => {
				if(data !== "connected") return;
				worker.removeEventListener("error", onerror);
				resolve(url);
			});
			worker.port.start();
		};
		const key = "hub-url";
		let worker;
		addEventListener("unload", onunload);
		let url = sessionStorage.getItem(key);
		const [hell0, resolve] = hell();
		try{
			if(!url) throw null;
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
	const put_url = (() => {
		const onunload = () => URL.revokeObjectURL(url);
		const url = URL.createObjectURL(new Blob([`"use strict";
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
					if(dbs.size) return;
					hub.send(list);
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
					const tick = hub.on(list1 => {
						if(list1.length <= i) return;
						for(let j = i; j >= 0; j -= 1) if(indexedDB.cmp(list[j], list1[j])) return;
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
						if(indexedDB.cmp(key, "end")) return get(store, ({target: {result}}) => {
							if(!result || !result.value){
								if(!result) put(store);
								return next(cancel, db);
							}
							if(i < length) f(i, result.value);
						});
						put(store);
						cancel();
						store.transaction.addEventListener("complete", () => {
							hub.send(list);
							tickline(port => port.postMessage("disconnect"))(hell1);
							end(db, ({target: {source}}) => put(source));
						});
					});
					const db = cn.result;
					const store = open_store(db);
					const cancel = close_db(store.transaction);
					if(i === 1) return f2();
					store.count().addEventListener("success", ({target: {result}}) => result && f2());
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
		return url;
	})();
	return db([]);
})();

const log_db = library.log_db = (db, level, scale = 10) => {
	const stop = () => {
		cancels.forEach(f => f());
		cancels.clear();
	};
	const run = () => cancels.add(db.on((b0, db) => {
		const check = b0 => b0 < line && db.put(null);
		if(b0 == null) return b0 === null && stop();
		check(b0);
		b0s.add(b0);
		const cancel = db.on(b1 => {
			if(b1 !== null) return;
			cancel();
			b0s.delete(b0);
			cancels.delete(cancel);
			if(line < (line = Math.max(line, b0))) b0s.forEach(check);
		});
		cancels.add(cancel);
	}));
	const id2bs = (id, ...rest) => Array(level).fill().map(() => id - (id = Math.floor(id / scale)) * scale).concat(id).reverse().concat(rest);
	const cancels = new Set;
	const b0s = new Set;
	let line = -Infinity;
	run();
	return {
		stop,
		restart: id => {
			if(!cancels.size) run();
			let t = Math.floor(id / scale ** level) - 1;
			if(!(t >= line)) return;
			db.put(t, null);
			t = id2bs(id);
			t.reduce((_, b, i) => Array(b).fill().forEach((_, j) => db.put(t[0], ...t.slice(1, i), j, null)));
		},
		path: (...path) => path.length ? db.path(...id2bs(...path)) : db,
		put: (...path) => path.length ? db.put(...id2bs(...path)) : db.put(),
		on: listener => {
			const f = (db, bs) => {
				if(dot.get(...bs)) return;
				const cancel = db.on((b, db) => {
					if(b == null){
						if(b !== null) return;
						cancel();
						return cancels.delete(cancel);
					}
					if(bs.length === level) return listener(bs.concat(b).reduce((s, b) => s * scale + b), db);
					f(db, bs.concat(b));
				});
				cancels.add(cancel);
				dot.set(...bs, true);
			};
			const cancel = db.on(() => {
				cancel();
				cancels.delete(cancel);
				listener();
			});
			const cancels = new Set([cancel]);
			const dot = multi_key_map();
			f(db, []);
			return () => cancels.forEach(f => f());
		},
	};
};

const tube = library.tube = (() => {
	let t;
	return cache(source => {
		if(t) return t;
		const states = multi_key_map();
		t = (...condition) => {
			const sync = () => {
				state = states.get(...condition);
				if(state) return state.handle_num += 1;
				const [hell0, resolve] = hell();
				state = {
					alive: true,
					thunk: genfn2tick(function*(){
						if(yield hell0 || arguments.length) return (yield hell0)(...arguments);
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
				if(state.handle_num) return;
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
						cancel = hell()[0];
						try{
							cancel = listener(...solution);
						}catch(error){}
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
					const listen = listener1 => {
						clearTimeout(timer);
						state.pool.delete(listen);
						[listener, cancel] = f0(listener1);
						if(solution) listener(...solution);
						return f1();
					};
					if(used) return;
					used = true;
					const tick = cancel();
					state.pool.add(listen);
					const timer = setTimeout(genfn2tick(function*(){
						state.pool.delete(listen);
						state.listener_num -= 1;
						yield (yield thunk || (() => {}))();
						listener_num -= 1;
						if(!listener_num) unsync();
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
					if(!state.listener_num) return listen(listener);
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
				setTimeout(() => {
					if(used) return;
					used = true;
					unsync();
				});
			};
		};
		const tube0 = tube(t);
		t = null;
		return tube0;
	});
})();

const tubeline = library.tubeline = (() => {
	const dp = new WeakMap;
	return (...tubes) => {
		const tubeline0 = (() => {
			switch(tubes.length){
			case 0:
				return tube((...args) => listener => listener && listener(...args));
			case 1:
				return dp.get(tubes[0]) || (() => {
					const solutions = [];
					const tube0 = tube((...condition) => {
						const thunk = tube(tubes[0])(...condition);
						return listener => {
							if(!listener) return thunk();
							let used = false;
							const thunk1 = thunk((...solution) => {
								used = true;
								listener(performance.now(), ...solution);
							});
							if(!used && solutions.length) listener(...solutions.pop());
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
				tubes = tubes.map(tube => tubeline(tube));
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
						Array.from(listeners).forEach(listen);
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

const ajax = library.ajax = (() => {
	const m2p = mlist => {
		let n = 0;
		const plist = [];
		mlist.sort(cmp).forEach(([p, b]) => {
			const n0 = n;
			n += b - .5;
			if(n0 !== 0 && n !== 0) return;
			if(plist[0] === p) return plist.shift();
			plist.unshift(p);
		});
		return plist.reverse();
	};
	const p2m = (b, plist) => plist.map(p => [p, b = !b]);
	const gmt2date = gmt => gmt ? +new Date(gmt) : -Infinity;

	const assign = tube(url => {
		const request = genfn2tick(function*(task = state.age = age += 1){
			const keys = ["ETag", "Last-Modified"];
			let state = states.get(url);
			if(!state || task < state.age || typeof task === "object" && (task !== state.edition || !task.plist1().length)) return;
			let headers;
			const queue = [() => {
				headers = [
					["Cache-Control", "max-age=0"],
					["Range", "bytes=" + cn.p + "-"],
				];
				if(edition && !edition.plist1().length) headers.push([
					["If-None-Match", "If-Modified-Since"][keys.indexOf(edition.tag[0])],
					edition.tag[1],
				]);
			}];
			let abort;
			let status;
			if("body" in Response.prototype){
				queue.push(genfn2tick(function*(){
					const init = {headers: new Headers};
					headers.forEach(header => init.headers.set(...header));
					const [, response] = yield prom2hell(fetch(url, init));
					if(!response) return;
					({status} = response);
					const reader = response.body.getReader();
					abort = () => reader.cancel().catch(() => {});
					headers = key => response.headers.get(key);
					task = genfn2tick(function*(push){
						while(t = ((yield prom2hell(reader.read()))[1] || {}).value) push(t);
						push();
					});
				}));
			}else{
				ReadableStream;
			}
			let {edition} = state;
			const cn = {p: (edition && edition.plist1()[0] + 1 || state.plist[0] + 1 || 1) - 1};
			state.roll(0);
			let stamp = performance.now();
			let timer = setTimeout(request, 3e3);
			counts.set(url, counts.get(url) + 1 || 1);
			queue.push(genfn2tick(function*(){
				queue.splice(-1, 1, abort);
				state = states.get(url);
				if(!state) return;
				const gmt = headers("Date");
				
			}));
			queue.push(() => {
				clearTimeout(timer);
				counts.set(url, counts.get(url) - 1 || undefined);
			}, () => request(task));
			let t;
			while(t = queue.shift()) yield t();
		});
		let timer;
		const db = local_db.path("ajax", 0, ...url, "");
		const records = log_db(db.path("records"), 8);
		const statuses = log_db(db.path("statuses"), 8);
		const cancels = new Set([records.stop, statuses.stop]);
		const state = {
			plist: [],
			roll: offset => {
				clearTimeout(timer);
				let x = (state.date - date0) / 1e3;
				if(Number.isNaN(x)) return;
				x = (Math.max(0, (Math.log(x / 10 + 1.4) - Math.log(1.5)) ** 1.2 * 16) || 0) + (x / 50) ** 0.8;
				timer = setTimeout(request, x * 1e3 - offset);
			},
		};
		states.set(url, state);
		return listener => {
			if(listener) return;
			state.plist = [];
			states.delete(url);
			cancels.forEach(f => f());
		};
	});
	const ajax = tube((url, ...list) => {
		let p = 0;
		list = list.map(d => p += d);
		const [hell0, resolve] = hell();
		const cancel = assign(url)(arrange => resolve(arrange(...list)));
		return listener => {
			if(listener){
				const cancel = tickline(f => f(listener))(hell0);
				return () => tickline(f => f())(cancel);
			}
			tickline(f => f())(hell0);
			cancel();
		};
	});
	let age = 0;
	const states = new Map;
	const counts = multi_key_map();
	return (url, ...rest) => ajax(format_url(url), ...rest);
})();

self.library = library;

return genfn2tick(function*(){
	for(let cancel of Array.from(cancels).reverse()) yield cancel();
});
