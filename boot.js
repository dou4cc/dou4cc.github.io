const {run, hell, is_hell, tickline, gen2tick, genfn2tick, prom2hell} = library;
library = Object.create(library);
const cancels = new Set;

const cmp = ([a], [b]) => a - b;

const format_url = url => {
	const iframe = document.createElement("iframe");
	iframe.src = url;
	return iframe.src;
};
library.format_url = format_url;

const same_list = (a, b) => a && a.length === b.length && a.every((a, i) => a === b[i] || Object.is(a, b[i]));
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
		return url;
	})();
	return {
		end,
		put: (...list) => {
			if(list.length === 0) return;
			list = format(list);
			const worker = new Worker(put_url);
			if(!is_hell(tickline(url => worker.postMessage(list, [new SharedWorker(url).port]))(hub_url))) return;
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
			format(list);
			genfn2tick(function*(){
				list = format(yield clone_list(list));
				if(cancel === null) return;
				({length} = list);
				cancel = hub.on(genfn2tick(function*(...list1){
					if(list1.length < length || !list.every((a, i) => indexedDB.cmp(a, list1[i]) === 0)) return;
					if(list1.length === length) return run(() => listener);
					const a = yield clone(unformat(list1[length]));
					if(cancel) run(() => () => listener(a));
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
		const tube = (...condition) => {
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
					if(state.listener_num === 0) return listen(listener);
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
		dp.set(tube, tube);
		dp.set(source, tube);
		return tube;
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

const ajax = (() => {
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
	const gmt2num = cache(date => Number.isNaN(date = +new Date(date)) ? -Infinity : date);

	let canceled = false;
	const states = new Map;
	const counts = multi_key_map();
	const assign = tube(uri => {
		const put = (edition, record, ...rest) => {
			if(canceled) return;
			db.put(...path, edition.tag, record, ...rest);
			let t = states.get(uri);
			if(!t) return;
			t = t.store(edition, record);
			if(rest[0]) t(...rest);
		};
		const request = genfn2tick(function*(edition){
			const end = () => {
				counts.set(uri, counts.get(uri) - 1 || undefined);
				clearTimeout(timer);
			};
			const p = () => {
				clearTimeout(timer);
				const list = edition.plist1();
				if(list.length === 0) return;
				for(let i = 2; i < list.length; i += 2) if(list[i - 1] < cn.p && list[i] > cn.p && list[i] - cn.p > 800){
					for(let {p, end} of state.pool){
						if(p === undefined || end === undefined) continue;
						if(p <= list[i] && p - cn.p > 2e3 && end >= cn.end) return;
					}
					request(edition);
					break;
				}
				return timer = setTimeout(request, (-stamp + (stamp = performance.now())) * 2, edition);
			};
			const then = (abort, status, header, then) => {
				const end1 = () => {
					abort();
					end();
				};
				state = states.get(uri);
				if(!state) return abort();
				const date = header("Date");
				if(status === 304 || (edition = null, status === 404)){
					end1();
					state.update(date, edition);
					if(state.date !== gmt2num(date)) return;
					state.roll(performance.now() - stamp);
					return edition && put(edition, [date]);
				}
				if(status === 206) for(let t of keys){
					const end2 = () => {
						t = true;
						state.pool.delete(cn);
						end();
					};
					const value = header(t);
					if(value === null) continue;
					edition = state.get_edition([t, value]);
					t = header("Content-Range").match(/^\s*bytes\s+(\d+)\s*-(\d+)\s*\/\s*(\d+)\s*$/i);
					put(edition, [date, "size", +t[3]]);
					cn.p = +t[1];
					cn.end = +t[2];
					t = header("Last-Modified");
					if(t !== null) put(edition, [date, "mtime", +new Date(t)]);
					t = header("Content-Type");
					if(t !== null) t.match(/^([^;]*).*?(?:;\s*charset\s*=([^;]*))?/i).slice(1).forEach((a, i) => a === undefined || put(edition, [date, ["type", "charset"][i], a.trim()]));
					state.update(date, edition);
					if(state.date === gmt2num(date)) state.roll(performance.now() - stamp);
					if(state.edition !== edition || !p()) return end1();
					t = false;
					cn.abort = () => {
						abort();
						end2();
					};
					state.pool.add(cn);
					return then(buffer => {
						if(t) return;
						if(!buffer){
							end2();
							return counts.get(uri) || request(edition);
						}
						put(edition, [date, "piece", cn.p, (cn.p += buffer.length) - 1], buffer);
						if(!p()) cn.abort();
					});
				}
				return abort();
			};
			let state = states.get(uri);
			if(!state || edition && (edition !== state.edition || edition.plist1().length === 0)) return;
			const keys = ["ETag", "Last-Modified"];
			counts.set(uri, counts.get(uri) + 1 || 1);
			({edition} = state);
			const cn = {p: (edition && edition.plist1()[0] + 1 || state.plist[0] + 1 || 1) - 1};
			const headers = () => {
				const headers = [
					["Cache-Control", "max-age=0"],
					["Range", "bytes=" + cn.p + "-"],
				];
				if(edition && edition.plist1().length === 0) headers.push([
					["If-None-Match", "If-Modified-Since"][keys.indexOf(edition.tag[0])],
					edition.tag[1],
				]);
				return headers;
			};
			let stamp = performance.now();
			let timer = setTimeout(request, 3e3);
			state.roll(0);
			if("body" in Response.prototype){
				const init = {headers: new Headers()};
				headers().forEach(header => init.headers.set(...header));
				const [, response] = yield prom2hell(fetch(uri, init));
				if(response){
					const {body, status, headers} = response;
					const reader = body.getReader();
					const abort = () => reader.cancel();
					if(!(yield then(abort, status, key => headers.get(key), genfn2tick(function*(push){
						let result;
						while(result = ((yield prom2hell(reader.read()))[1] || {}).value) push(result);
						push();
					})))) return;
				}
			}else{
				ReadableStream;
			}
			end();
			request();
		});
		const arrange = tube((...plist) => {
			const mlist = p2m(true, plist);
			mlists.add(mlist);
			state.plist = m2p(p2m(true, state.plist).concat(mlist));
			if(!counts.get(uri)) request();
			let date;
			const listener = (...args) => args.length === 0 && ({date} = state);
			listeners.add(listener);
			const length = Math.ceil(plist.length / 2) + 1;
			return listener1 => {
				if(!listener1){
					listeners.delete(listener);
					mlists.delete(mlist);
					state.plist = m2p([].concat(...mlists));
				}
				let {edition} = state;
				let progress = 0;
				const lists = new Map;
				const listener = (...t) => {
					if(t.length === 0){
						edition = null;
						return listener1();
					}
					const [edition1, begin, piece] = t;
					t = lists.get(edition1);
					if(!t) lists.set(edition1, t = new Array(length).fill(new Blob));
					const list = t;
					let i = (length - list.length) * 2;
					for(let j = 1, k = i; list[j] && !(begin > plist[k + 1]); j += 1, k += 2){
						t = begin - plist[k];
						if(t <= list[j].size) list[j] = new Blob([list[j].slice(0, t), piece]);
					}
					for(; list[1] && (t = plist[i + 1] - plist[i] + 1) <= list[1].size; i += 2) list[0] = new Blob([
						list[0],
						list.splice(1, 1)[0].slice(0, t || undefined),
					]);
					t = new Blob([list[0], list[1] || ""]);
					const progress1 = list[1] ? t.size : Infinity;
					if(edition && Math.sign(progress1 - progress) + Math.sign(edition1.date - edition.date) < 1) return;
					edition = edition1;
					progress = progress1;
					const info = {};
					if(!Number.isNaN(edition.size)) info.size = edition.size;
					if(!Number.isNaN(edition.mtime)) info.mtime = new Date(edition.mtime);
					if(edition.type !== null) info.type = edition.type;
					if(edition.charset !== null) info.charset = edition.charset;
					listener1(t, progress === Infinity, edition.tag.join(": "), info);
				};
				listeners.add(listener);
				if(edition){
					edition.pieces.forEach((piece, i) => listener(edition, edition.plist0[i * 2], piece));
				}else if(date === state.date){
					listener();
				}
				return () => listeners.delete(listener);
			};
		});
		const path = ["cache", uri];
		const dir = (() => {
			const dir = path => (...path1) => {
				let cancel;
				const listener = path1.pop();
				path1 = clone_list(path1);
				genfn2tick(function*(){
					path1 = (yield path).concat(yield path1);
					if(cancel !== null) cancel = db.on(...path1, (...path) => listener(dir(tickline(path => path1.concat(path))(clone_list(path))), ...path));
				})();
				return () => {
					if(cancel) cancel();
					cancel = null;
				};
			};
			return dir(path);
		})();
		let timer;
		let date0;
		let date1;
		const editions = [];
		const mlists = new Set;
		const listeners = new Set;
		const dot = multi_key_map();
		const cancels = new Set([dir((dir, tag) => tag && state.get_edition(tag))]);
		const state = {
			plist: [],
			date: -Infinity,
			pool: new Set,
			roll: offset => {
				clearTimeout(timer);
				let x = (state.date - date0) / 1e3;
				if(Number.isNaN(x)) return;
				x = (Math.max(0, (Math.log(x / 10 + 1.4) - Math.log(1.5)) ** 1.2 * 16) || 0) + (x / 50) ** 0.8;
				return timer = setTimeout(request, x * 1e3 - offset);
			},
			get_edition: edition => dot.get(...edition) || (() => {
				const f = cache(size => {
					let t = p2m(true, m2p(p2m(true, edition.plist0).concat(p2m(true, state.plist)))).concat(p2m(false, edition.plist0));
					if(Number.isNaN(size)) return m2p(t);
					t = t.concat(p2m(true, [0, size - 1]));
					return m2p(t.concat(p2m(false, m2p(t))));
				});
				edition = {
					tag: edition,
					date: -Infinity,
					plist0: [],
					plist1: () => f(edition.size, ...edition.plist0, NaN, ...state.plist),
					records0: new Set,
					records1: new Set,
					pieces: [],
					size: NaN,
					mtime: NaN,
					type: null,
					charset: null,
				};
				editions.push(edition);
				dot.set(...edition.tag, edition);
				cancels.add(dir(edition.tag, (dir, record) => {
					if(!record) return;
					const thunk = state.store(tag, record);
					state.update(record[0], edition);
					if(thunk) cancels.add(dir((dir, buffer) => buffer && thunk(buffer)));
				}));
				return edition;
			})(),
			update: (gmt, edition) => {
				const date = gmt2num(gmt);
				if(date <= state.date) return;
				state.date = date;
				if(state.edition === (state.edition = edition)) return edition || listeners.forEach(f => f());
				state.pool.forEach(cn => cn.abort());
				state.pool.clear();
				if(date0 === undefined){
					date0 = date - 7e3;
				}else{
					date0 = date;
					request();
				}
				if(!edition) return listeners.forEach(f => f());
				listeners.forEach(f => f(edition, 0, new Blob));
				const list = [].concat(...[...edition.records1].map(([, , ...range]) => p2m(true, range)));
				if(list.length > 0) editions.pieces.forEach((piece, i) => {
					const begin = edition.plist0[i * 2];
					const ranges = m2p(p2m(false, m2p(p2m(true, begin, begin + piece.size - 1).concat(list))).concat(p2m(true, m2p(list))));
					for(let i = ranges.length - 1; i > 0; i -= 2){
						const record = [gmt, "piece", ranges[i - 1], ranges[i]];
						put(edition, record);
						const reader = new FileReader;
						const cn = {abort: () => reader.abort()};
						reader.addEventListener("loadend", () => state.pool.delete(cn));
						reader.addEventListener("load", () => put(edition, record, new Uint8Array(reader.result)));
						reader.readAsArrayBuffer(piece.slice(record[2] - begin, record[3] - begin + 1));
						state.pool.add(cn);
					}
				});
			},
			store: (edition, list) => {
				const record = dot.get(edition, ...list) || (() => {
					const record = list.slice();
					dot.set(edition, ...list, record);
					return record;
				})();
				edition.date = Math.max(edition.date, gmt2num(list.shift()));
				const flag = list.shift();
				if(flag !== "piece") return flag && ([edition[flag]] = list);
				edition.records0.add(record);
				return buffer => {
					const {date, plist0, records1, pieces} = edition;
					if(buffer === db.end){
						edition.records0.delete(record);
						return records1.delete(record);
					}
					records1.add(record);
					if(!same_list(plist0, list = edition.plist0 = m2p(p2m(false, list).concat(p2m(false, plist0))))){
						let i = 0;
						let j = 0;
						const p0 = () => i < plist0.length && j < list.length;
						const p1 = () => plist0[i] === list[i] && plist0[i + 1] === list[i + 1];
						for(; p0() && p1(); i += 2, j += 2);
						for(j += 2; p0() && !p1(); i += 2);
						const m = j / 2 - 1;
						const n = i / 2 - m;
						pieces.splice(m, n, new Blob([
							pieces[m] ? pieces[m].slice(0, Math.min(0, record[2] - plist0[j - 1] - 1)) : "",
							buffer,
							pieces[n] ? pieces[n].slice(Math.max(0, record[3] - plist0[i - 2] + 1)) : "",
						]));
						listeners.forEach(f => f(edition, list[m * 2], pieces[m]));
					}
					if(date < date1) return put(edition, record, db.end);
					if(edition.size !== (pieces[0] || {}).size) return;
					date1 = date;
					editions.forEach(edition => edition.date < date && edition.records0.forEach(record => put(edition, record, db.end)));
				};
			},
		};
		states.set(uri, state);
		return listener => {
			if(listener) return listener(arrange);
			states.delete(uri, state);
			state.plist = [];
			cancels.forEach(f => f());
		};
	});
	const ajax = tube((uri, ...list) => {
		let p = 0;
		list = list.map(d => p += Math.floor(d));
		const [hell0, resolve] = hell();
		const cancel = assign(uri)(arrange => resolve(arrange(...list)));
		return listener => {
			if(listener){
				const cancel = tickline(f => f(listener))(hell0);
				return () => tickline(f => f())(cancel);
			}
			tickline(f => f())(hell0);
			cancel();
		};
	});
	cancels.add(() => canceled = true);
	return (uri, ...rest) => ajax(format_url(uri), ...rest);
})();
library.ajax = ajax;

self.library = library;

return genfn2tick(function*(){
	for(let cancel of [...cancels].reverse()) yield cancel();
});
