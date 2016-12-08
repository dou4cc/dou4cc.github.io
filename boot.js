﻿const hub = (() => {
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
//self.hub = hub;

const list_map = () => {
	const tree = new Map;
	const set = (parent, value, ...list) => {
		if(list.length > 1){
			if(!parent.has(list[0])) parent.set(list[0], new Map);
			set(parent.get(list[0]), value, ...list.slice(1));
		}else{
			parent.set(list[0], value);
		}
	};
	const has = (parent, ...list) => list.length > 0 ? parent.has(list[0]) && has(parent.get(list[0]), ...list.slice(1)) : true;
};

const tube = (() => {
	
})();
