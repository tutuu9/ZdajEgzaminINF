// Emmet 2.4 ships these declarations but omits them from its package exports.
declare module 'emmet' {
  type Published = typeof import('../../../node_modules/emmet/dist/index.js');
  const expand: Published['default'];
  export default expand;
  export const extract: Published['extract'];
}
