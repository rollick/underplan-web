///////////////////////////////////////////////////////////////////////////////
// Search Inout for Activity Editor

clearHiddenLocationFields = function (template) {
  template.find("#lat").value = "";
  template.find("#lng").value = "";
  template.find("#city").value = "";
  template.find("#country").value = "";
  template.find("#region").value = "";
  
  template.find(".location-coords").innerHTML = "";
};

Template.searchableLocation.destroyed = function () {
  this._autocomplete = null;
};

Template.searchableLocation.rendered = function () {
  this._autocomplete = new google.maps.places.Autocomplete(this.find(".location-search"));
};

Template.searchableLocation.events({
  'click .show-advanced-location': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var fields = template.find(".location-fields");
    $(fields).toggle();
  },
  'keydown .location-search': function (event, template) {
    if(event.which === 13)
      event.preventDefault();
  },
  'keyup .location-search': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var locationElem = $(event.target)
    var location = locationElem.val();

    if (location.length === 0) {
      clearHiddenLocationFields(template);
      return false;
    }

    if (event.keyCode === 13) {
      google.maps.event.trigger(template._autocomplete, 'place_changed');
      return false;
    }
    
    if(event.keyCode === 40 || event.keyCode === 38)
      return false;
    
    coords = geoLocation(location, "location", template._autocomplete, function(geo) {
      if(typeof geo === "object") {
        template.find("#lat").value = geo.lat;
        template.find("#lng").value = geo.lng;
        template.find("#city").value = geo.city;
        template.find("#country").value = geo.country;
        template.find("#region").value = geo.region;

        template.find(".location-coords").innerHTML = Math.round(geo.lat*10000)/10000 + ", " + Math.round(geo.lng*10000)/10000 + " (" + geo.address + ")";
      } else {
        clearHiddenLocationFields(template);

        template.find(".location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");      
      }
    });
  },
});