const global = this;

const set_once = (set, f) => {
	const thunk = () => {
		f();
		set.delete(thunk);
	};
	set.add(thunk);
};

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
set_once(cancel_set, () => Reflect.deleteProperty(global, "prevent_unload"));
{
	const listener = event => unload_count > 0 && (event.returnValue = "系统可能不会保存您所做的更改。");
	addEventListener("beforeunload", listener);
	set_once(cancel_set, () => removeEventListener("beforeunload", listener));
}

{
	const span = document.createElement("span");
	span.textContent = "Loaded :(";
	document.body.append(span);
	set_once(cancel_set, () => span.remove());
}

return async () => {
	if(unload_count > 0) await new Promise(resolve => set_once(unload_set, resolve));
	await Promise.all([...cancel_set].reverse().map(cancel => cancel()));
};
