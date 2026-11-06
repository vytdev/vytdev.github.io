/**
 * Alternative to JSON.stringify() with more size-efficient serialization.
 * Take note that it cannot be directly deserialized with JSON.parse().
 * You'd have to evaluate it.
 * @param obj The object to serialize.
 * @returns The serialized string.
 */
export function serializeJSObject(obj) {
  if (typeof obj === 'string')
    return JSON.stringify(obj);
  if (typeof obj === 'number')
    return obj.toString();
  if (typeof obj === 'boolean')
    return obj ? 'true' : 'false';
  if (obj instanceof Array)
    return `[${obj.map(serializeJSObject).join(',')}]`;

  const jsIdRegex = /^[_a-zA-Z$][_a-zA-Z0-9$]*$/;

  let objStr = '';
  for (const k in obj){
    const kAsNum = +k;
    objStr += ','
    if (!isNaN(kAsNum))
      objStr += kAsNum.toString();
    else if (jsIdRegex.test(k))
      objStr += k;
    else
      objStr += JSON.stringify(String(k));
    objStr += ':' + serializeJSObject(obj[k]);
  }

  return '{' + objStr.slice(1) + '}';
}
