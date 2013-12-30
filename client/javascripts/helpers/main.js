// Taken from http://stackoverflow.com/a/8897628
jQuery.expr.filters.offscreen = function(el) {
  return (
    (el.offsetLeft + el.offsetWidth) < 0 
    || (el.offsetTop + el.offsetHeight) < 0
    || (el.offsetLeft > window.innerWidth || el.offsetTop > window.innerHeight)
  );
};

Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
  if (arguments.length < 3)
    throw new Error("Handlebars Helper equal needs 2 parameters");
  if( lvalue!=rvalue ) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper("appVersion", function() {
  return Session.get("appVersion");
});

Handlebars.registerHelper("isCurrentCountry", function (country) {
  if(country === "all" && !ReactiveGroupFilter.get("country"))
    return "active";

  return (country === ReactiveGroupFilter.get("country") ? "active" : "");
});

Handlebars.registerHelper("activityLink", function() {
  var group = Groups.findOne({_id: this.group}, {slug: 1});

  if(!group)
    return "#";
  return "/" + group.slug + "/" + this.slug;
});

Handlebars.registerHelper('ownerName', function() {
  if(typeof this == "undefined")
    return "N/A";

  var owner = Meteor.users.findOne(this.owner);
  if (!!owner) {
    if(owner._id === Meteor.userId()) {
      return "me";
    } else {
      return displayName(owner);
    }
  } else {
    return "N/A";
  }
});

Handlebars.registerHelper('date', function(dateValue) {
  return App.Utils.formattedDate(dateValue);
});

Handlebars.registerHelper('simpleDate', function(date) {
  if(date) {
    dateObj = new Date(date);
    return Handlebars._escape(dateObj.toLocaleDateString());
  }
  return '';
});

Handlebars.registerHelper('userName', function(userId) {
  if(userId) {
    user = Meteor.users.findOne(userId);
    if(user)
      return displayName(user);
  } 
  return 'Anonymous Coward';
});

Handlebars.registerHelper('profilePicture', function(userId) {
  var pictureUrl = userPicture(Meteor.users.findOne(userId), 90);
  
  return pictureUrl;
});

Handlebars.registerHelper('basicLocation', function(activity) {
  var location = "";
  if (_.isString(activity.country) && activity.country.length) {
    if (ReactiveGroupFilter.get("country")) {
      location = activity.city || "";
    } else {
      location = [activity.city, activity.country].join(", ");
    }
  }

  if (location.length) {
    return location;
  } else {
    return "";
  }
});

///////////////////////////////////////////////////////////////////////////////
// Date Picker

Template.datePicker.helpers({
  equalTo: function (value) {
    return value == this;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Helper Template for Date Picker

Template.ifEqual.isEqual = function (value1, value2) {
  return value1 == value2;
};