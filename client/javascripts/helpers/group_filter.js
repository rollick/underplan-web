// Use a reactive source to store feed filter information
// eg. country, limit, 
ReactiveGroupFilter = {
  clear: function (options) {
    options = options || {};
    var self = this;
    Object.keys(this._fields).forEach( function (key) {
      self.set(key, null, options);
    });

    // this._fieldsDep = {}
  },

  get: function (key) {
    this._ensureDep(key);
    this._fieldsDep[key].depend();

    if (key === "feedFilter")
      return this._fields;
    else if (key === "queryFields")
      return this._queryFields();
    else if (key === "subscriptionOptions")
      return this._subscriptionOptions();
    else
      return this._fields[key];
  },

  // Return whether the key needed to be updated, eg it was different
  // to the current value
  set: function (key, value, options) {
    options = options || {};
    var nested = options['nested'] || false;
    var quiet = options['quiet'] || false;

    this._ensureDep(key);

    // if the whole feedfilter has been requested then set the individual 
    // fields using the value passed
    var self = this;
    if (key === "feedFilter" && _.isObject(value)) {
      var didChange = false;
      Object.keys(value).forEach( function (subkey) {
        if (self.set(subkey, value[subkey], {nested: true}))
          didChange = true;
      });

      if (didChange && !quiet)
        this._aggregatedFieldsChanged();

      return didChange;
    } else if (key !== "feedFilter") {
      if(this._fields[key] !== value) {
        this._fields[key] = value;

        if (!quiet) {
          logIfDev("++ Called changed on " + key);
          this._fieldsDep[key].changed();
        }

        // if the set was nested then the call to changed for the feedFilter
        // and queryFields will need to occur manually
        if (!nested && !quiet) {
          this._aggregatedFieldsChanged();
        }

        return true
      }
    } else {
      logIfDev("Failed to set ReactiveGroupFilter with args: " + [key, value]);
    }

    return false;
  },

  _fields: {
    country: null,
    limit: null,
    group: null,
    groupSlug: null,
    activity: null,
    activitySlug: null
  },
  
  _fieldsDep: {},

  _aggregatedFields: ['queryFields', 'subscriptionOptions'],

  // remove null fields for mongo query
  // TODO: is this always a good idea?
  _queryFields: function () {
    var qfields = {},
        fields = this._fields;

    qfields.group = fields.group;
    if (fields.country)
      qfields.country = fields.country;

    return qfields;
  },

  _subscriptionOptions: function () {
    var options = {
      groupId: this._fields["group"],
      limit: this._fields["limit"]
    }

    if (!!this._fields["country"])
      options["country"] = this._fields["country"];

    return options;
  },

  _ensureDep: function (key) {
    if (!this._fieldsDep[key])
      this._fieldsDep[key] = new Deps.Dependency;

    this._ensureAggregatedDeps();  
  },

  _aggregatedFieldsChanged: function (newFields) {
    var self = this;
    this._aggregatedFields.forEach( function (field) {
      logIfDev("++ Called changed on " + field);
      self._fieldsDep[field].changed();
    });
  },

  // Also ensure dep for queryFields as it shouldn't ever be 'set'
  _ensureAggregatedDeps: function () {
    var self = this;
    this._aggregatedFields.forEach( function (field) {
      if (!self._fieldsDep[field])
        self._fieldsDep[field] = new Deps.Dependency; 
    });
  }
};