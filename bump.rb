#!/usr/bin/ruby

# require 'rubygems'
# require 'pry'
# binding.pry

up = ARGV[0] == "-b" ? false : true

filePath = "./client/javascripts/main.js"

if File.exists? filePath
  code = File.read(filePath)

  File.open(filePath, "w") do |f| 
    version = code.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})/)

    major = version[1]
    minor = version[2]
    change = version[3]

    if up
      change = change.to_i + 1
    else
      change = change.to_i - 1
    end

    versionStr = "#{major}.#{minor}.#{change}"    
    code.gsub!(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})/, versionStr)

    f.write code 
    puts "#{up ? "Bumping" : "Unbumping"} version to: #{versionStr}" 
  end
end