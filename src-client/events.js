
/**
 * EventHandler class.
 */
function EventHandler() {
  if (!(this instanceof EventHandler))
    throw new TypeError('Cannot instantiate event class without "new"');
  this._listeners = [];
  this._idCounter = 0;
}

/* Class prototype. */
EventHandler.prototype = {
  /**
   * @private
   * Get a listener id.
   */
  _getId: function() {
    return this._idCounter++;
  },

  /**
   * Listens for an event.
   * @param ev The event to listen for.
   * @param func The listener callback.
   * @param once Whether to only listen once.
   * @param prep Put this listener in priority.
   * @returns Listener id which can be used for removeEventListener().
   */
  addEventListener: function(ev, func, once, prep) {
    const data = { ev, func, once, id: this._getId() };
    if (prep)
      this._listeners.unshift(data);
    else
      this._listeners.push(data);
    return data.id;
  },

  /**
   * Removes an event listener.
   * @param id The id of the event listener.
   * @returns True if the listener is removed successfuly.
   */
  removeEventListener: function(id) {
    const idx = this._listeners.findIndex(v => v.id == id);
    if (idx == -1)
      return false;
    const listener = this._listeners.splice(idx, 1);
    return true;
  },

  /**
   * Triggers an event.
   * @param ev The event name to trigger.
   * @param ...args The args to pass to the listeners.
   */
  dispatchEvent: function(ev, ...args) {
    const len = this._listeners.length;
    for (let i = 0; i < len; i++) {
      const listener = this._listeners[0];
      if (listener.ev != ev)
        continue;
      this._listeners.shift();
      try {
        listener.func.apply(this, args);
      }
      catch {
        /* no-op */
      }
      if (!listener.once)
        this._listeners.push(listener);
    }
  },

  /**
   * An alias of dispatchEvent.
   * @param ev
   * @param ...args
   */
  emit: function(ev, ...args) {
    this.dispatchEvent(ev, ...args);
  },

  /**
   * Listens for an event.
   * @param ev The event.
   * @param func The listener.
   * @returns Listener id.
   */
  on: function(ev, func) {
    this.addEventListener(ev, func, false, false);
  },

  /**
   * Listens for an event, once.
   * @param ev The event.
   * @param func The listener.
   * @returns Listener id.
   */
  once: function(ev, func) {
    this.addEventListener(ev, func, true, false);
  },

  /**
   * Listens for an event, with priority.
   * @param ev The event.
   * @param func The listener.
   * @returns Listener id.
   */
  prioritze: function(ev, func) {
    this.addEventListener(ev, func, false, true);
  },

  /**
   * Listens for an event once, with priority.
   * @param ev The event.
   * @param func The listener.
   * @returns Listener id.
   */
  prioritzeOnce: function(ev, func) {
    this.addEventListener(ev, func, true, true);
  },

  /**
   * Removes an evenr listener.
   * @param id
   * @returns Boolean.
   */
  off: function(id) {
    return this.removeEventListener(id);
  },
};


/**
 * A global event handler.
 */
const globalEvents = new EventHandler();
/* Event after the DOM is loaded. */
window.onload = function() {
  globalEvents.emit('load');
};


exports = module.exports = {
  EventHandler,
  globalEvents,
};
