const end = Symbol();
const map_tree = new Map;
const the = (root, [item, ...rest]) => {
	if(rest.length > 0){
		if(!root.has(item)) root.set(item, new Map);
		return the(root.get(item), rest);
	}else{
		if(!root.has(item)) root.set(item, Symbol());
		return root.get(item);
	}
};
const the_list_map = new Map;
const the_list = (...list) => {
	const symbol = the(map_tree, [...list, end]);
	if(!the_list_map.has(symbol)) the_list_map.set(symbol, list);
	return the_list_map.get(symbol);
};
let id_next = 0;
const id_map = new Map;
const id = object => {
	if(!id_map.has(object)) id_map.set(object, id_next++);
	return id_map.get(object);
};
const the_collection = (...list) => the_list(...list.sort((a, b) => id(a) - id(b)));
