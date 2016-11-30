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
					port.addEventListener("message", ({data}) => [...port_set].forEach(port => port.postMessage(data)));
					port.start();
					port.postMessage("connected");
				}));
			`], {type: "text/javascript"}));
			sessionStorage.setItem(key, uri);
		};
		const connect = () => {

		};
		try{
			worker = new SharedWorker(uri);
		}catch(error){
			make();
			worker = new SharedWorker(uri);
		}
			const onerror = () => {
				hub.removeEventListener("error", onerror);
				const uri = sessionStorage.getItem(key);
				if(uri === hub_uri) create();
				connect(uri);
			};
			hub.addEventListener("error", onerror);
		};
		connect(sessionStorage.getItem(key));
	});
	return {
		send: (...list) => {
			promise.then(() => {
				worker.port.postMessage(...list);
			});
		},
		on: async listener => {
			await promise;
			const onmessage = ({list}) => {
				if(list instanceof Array) listener(...list);
			};
			worker.port.
		},
	};
})();

