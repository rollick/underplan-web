// Use a reactive source to store feed filter information
// eg. country, limit, 
ReactiveFeedFilter = {
  fields: {
    country: null,
    limit: null,
    group: null
  },
  fieldsDep: {},

  // remove null fields for mongo query
  // TODO: is this always a good idea?
  queryFields: function () {
    var reducedFields = _.clone(this.fields);
    Object.keys(reducedFields).forEach( function(key) { 
      if (!reducedFields[key]) {
        delete reducedFields[key];
      }
    });

    return reducedFields;
  },

  clear: function () {
    Object.keys(this.fields).forEach( function (key) {
      this.set(key, null);
    });
  },

  get: function (key) {
    this.ensureDep(key);
    this.fieldsDep[key].depend();

    if (key === "feedFilter")
      return this.fields;
    else if (key === "queryFields")
      return this.queryFields();
    else
      return this.fields[key];
  },

  set: function (key, value, nested) {
    if (typeof nested === 'undefined')
      nested = false;

    this.ensureDep(key);

    // if the whole feedfilter has been requested then set the individual 
    // fields using the value passed
    var self = this;
    if (key === "feedFilter" && _.isObject(value)) {
      Object.keys(value).forEach( function (subkey) {
        self.set(subkey, value[subkey], true);
      });

      this.fieldsDep['feedFilter'].changed();
      this.fieldsDep['queryFields'].changed();
    } else if (key !== "feedFilter") {
      this.fields[key] = value;
      this.fieldsDep[key].changed();

      // if the set was nested then the call to changed for the feedFilter
      // and queryFields will need to occur manually
      if (!nested) {
        this.fieldsDep['feedFilter'].changed();
        this.fieldsDep['queryFields'].changed();
      }
    } else {
      logDev("Failed to set ReactiveFeedFilter with args: " + [key, value]);
    }
  },

  ensureDep: function (key) {
    if (!this.fieldsDep[key])
      this.fieldsDep[key] = new Deps.Dependency;

    // Also ensure dep for queryFields as it shouldn't ever be 'set'
    if (!this.fieldsDep['queryFields'])
      this.fieldsDep['queryFields'] = new Deps.Dependency; 

    if (!this.fieldsDep['feedFilter'])
      this.fieldsDep['feedFilter'] = new Deps.Dependency;    
  }
};