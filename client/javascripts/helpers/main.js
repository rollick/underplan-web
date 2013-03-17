// Taken from http://stackoverflow.com/a/8897628
jQuery.expr.filters.offscreen = function(el) {
  return (
    (el.offsetLeft + el.offsetWidth) < 0 
    || (el.offsetTop + el.offsetHeight) < 0
    || (el.offsetLeft > window.innerWidth || el.offsetTop > window.innerHeight)
  );
};

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

// Compare the passed value to the current context
Handlebars.registerHelper('ifCond', function(value) {
  if(value == this) {
    return "selected";
  }
  return "";
});

Handlebars.registerHelper('date', function(date) {
  if(date) {
    dateObj = new Date(date);
    return Handlebars._escape($.timeago(dateObj));
  }
  return 'N/A';
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

Handlebars.registerHelper('datePicker', function(date) {
  if(typeof date != "object" || typeof date.getMonth != "function") {
    date = new Date();
  }

  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var month = months[date.getMonth()];
  var year = date.getFullYear();
  var day = date.getDate();
  var days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
  var years = [year-2, year-1, year, year+1, year+2];

  Template.datePicker.selectedYear = function() { return year; };
  Template.datePicker.selectedMonth = function() { return month; };
  Template.datePicker.selectedDay = function() { return day; };

  Template.datePicker.years = function() { return years; };
  Template.datePicker.months = function() { return months; };
  Template.datePicker.days = function() { return days; };

  return new Handlebars.SafeString(Template.datePicker());
});