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