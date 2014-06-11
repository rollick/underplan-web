this.App = {
  Utils: {},
};

this.App.isDev = Meteor.settings.public.env == "dev";

this.logIfDev = function (message) {
  if(App.isDev)
    console.log("Underplan: " + message);
}