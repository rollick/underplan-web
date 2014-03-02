this.App = {
  Utils: {}
};

this.isDev = function () {
  return Meteor.settings.public.env == "dev";
}

this.logIfDev = function (message) {
  if(isDev())
    console.log("Underplan: " + message);
}