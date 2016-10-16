const global = this;

const cancel_set = new Set;
const unload_set = new Set;
let unload_count = 0;
global.prevent_unload = () => {
	unload_count += 1;
	let flag = true;
	return () => {
		if(flag){
			unload_count -= 1;
			flag = false;
			if(unload_count === 0) [...unload_set].forEach(unload => unload());
		}
	};
};
{
	const cancel = () => {
		Reflect.defineProperty(global, "prevent_unload");
		cancel_set.delete(cancel);
	};
	cancel_set.add(cancel);
}
addEventListener("beforeunload", event => unload_count > 0 && (event.returnValue = "系统可能不会保存您所做的更改。"));



return async () => {
	if(unload_count > 0) await new Promise(resolve => {
		const unload = () => {
			resolve();
			unload_set.delete(unload);
		};
		unload_set.add(unload);
	});
	await Promise.all([...cancel_set].map(cancel => cancel()));
};
