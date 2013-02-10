Handlebars.registerHelper('date', function(date) {
  if(date) {
    dateObj = new Date(date);
    return Handlebars._escape($.timeago(dateObj));
  }
  return 'N/A';
});

Handlebars.registerHelper('userName', function(userId) {
  if(userId) {
    user = Meteor.users.findOne(userId);
    if(user)
      return Handlebars._escape(user.profile.name);
  }
  return 'Anonymous Coward';
});