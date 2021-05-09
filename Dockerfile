# Use an node runtime as a parent image
FROM node:16-alpine

# Create base directory
RUN mkdir ted-3parch

# Set the working directory to /ted-3parch
WORKDIR /ted-3parch

# Copy current directory (validator code) to /ted-3parch
COPY . /ted-3parch/

# Install needed packages
RUN npm install --silent
RUN npm link
