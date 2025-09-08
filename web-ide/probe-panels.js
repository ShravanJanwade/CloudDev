try {
  const panels = require('react-resizable-panels');
  console.log('Exports:', JSON.stringify(Object.keys(panels)));
} catch (e) {
  console.error(e);
}
