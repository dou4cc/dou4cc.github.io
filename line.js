let bin = [];

const equal = (a, b) => {
	if(a === b) return true;
	if(a.length !== b.length) return false;
	for(let i = a.length - 1; i >= 0; i -= 1){
		if(a[i] !== b[i]) return false;
	}
	return true;
};

const update = (method, push, ...data) => {//console.log(bin);
	const index = bin.findIndex((t => ([thunk, ...key]) => equal(t, key))([method, ...data]));
	if(index >= 0){
		const [thunk] = bin[index];
		bin = [...bin.slice(0, index), ...bin.slice(index + 1)];
		return thunk(push);
	}else{
		let process;
		let last_data;
		let unpushed_data;
		let pushable = true;
		const cancel = method((...data) => {
			unpushed_data = data;
			clearTimeout(process);
			if(pushable){
				if(last_data && !equal(last_data, unpushed_data)){
					process = setTimeout(() => push(...(last_data = unpushed_data)), 0);
				}else{
					push(...(last_data = unpushed_data));
				}
			}
		}, ...data);
		const thunk = () => {
			pushable = false;
			const item = [
				(push1) => {
					push = push1;
					clearTimeout(process);
					pushable = true;
					unpushed_data && push(...(last_data = unpushed_data));
					return thunk;
				},
				method,
				...data,
			];
			const process = setTimeout(() => {
				bin = bin.filter(i => i !== item);
				cancel && cancel();
			}, 0);
			bin.push(item);
		};
		return thunk;
	}
};

const line = cancel => {
	let data;
	let bin = [];
	let status = 0;
	return [
		(...data1) => {
			data = data1;
			bin = bin.map(([cancel, push]) => {
				cancel();
				return push(...data);
			});
		},
		method => {
			if(method && status < 2){
				status = 1;
				let item;
				const [push, thunk] = line(() => {
					bin = bin.filter(i => i !== item);
					item[0]();
					bin.length === 0 && cancel();
				});
				const fork = (...data) => item = [update(method, push, ...data), fork];
				if(data){
					bin.push(fork(...data));
				}else{
					bin.push(item = [() => {}, fork]);
				}
				return thunk;
			}else if(!method && status < 1){
				status = 2;
				cancel();
			}
		},
	];
};

return (...data) => {
	const [push, thunk] = line(() => {});
	push(...data);
	return thunk;
};