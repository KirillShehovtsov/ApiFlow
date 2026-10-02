import { EventEmitter } from 'events';

const hub = new EventEmitter();
hub.setMaxListeners(1000);

export const publishTestScriptUpdate = (userId, scriptId, payload) => {
  hub.emit('update', { userId, scriptId, payload });
};

export const onTestScriptUpdate = (listener) => {
  hub.on('update', listener);
  return () => hub.off('update', listener);
};

