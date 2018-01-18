# Ncodr

[![GitHub release](https://img.shields.io/github/tag/aztechian/ncodr.svg)](https://github.com/aztechian/ncodr/releases)
[![Build Status](https://travis-ci.org/aztechian/ncodr.svg?branch=master)](https://travis-ci.org/aztechian/ncodr)
[![Greenkeeper badge](https://badges.greenkeeper.io/aztechian/ncodr.svg)](https://greenkeeper.io/)
[![Maintainability](https://api.codeclimate.com/v1/badges/aa1620124c35e6771c44/maintainability)](https://codeclimate.com/github/aztechian/ncodr/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/aa1620124c35e6771c44/test_coverage)](https://codeclimate.com/github/aztechian/ncodr/test_coverage)
[![Github All Releases](https://img.shields.io/github/downloads/aztechian/ncodr/releases/total.svg)](https://github.com/aztechian/ncodr/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/aztechian/ncodr.svg)](https://hub.docker.com/r/aztechian/ncodr/)
[![license](https://img.shields.io/github/license/aztechian/ncodr.svg)](https://github.com/aztechian/ncodr/blob/master/LICENSE)

Ncodr (en-code-er) is a web-based, distributed application for controlling a ripping and encoding queue.
It's intention is to support DVD and BD (Blu-Ray Disc) ripping and encoding to MPEG-4. By default, it encodes to an "iTunes" compatible `m4v` container with h264 video codec. Audio encoding can be easily changed from the options field that is submitted with a job.

Utilizing [bull](https://github.com/OptimalBits/bull) for the queue control, this
app will submit jobs to the respective queue, and provide workers to process the
queued jobs. Bull utilizes a [Redis](https://redis.io) database for persistent queue information storage. This should be externally provided by your production environment.

Additionally, Ncodr supplies a RESTful API around the bull queues, so that jobs may be easily submitted via HTTP interfaces.

The tools doing the hard part (`dvdbackup`, `makemkv` and `HandBrakeCLI`) are expected to be available on the `$PATH` for Ncodr to use. The primary packaging for this app is a ~Docker~ sorry, Moby container, which provides all the tools needed, and makes Ncodr the entry point.

As long as the app is configured to look at the redis location, as many containers as necessary can
be started to process jobs for parallelizing encoding work. Generally, this would be
one container per physical host, as HandBrake can be multi-threaded across CPUs - even
in a container.

`/dev/sr0` detection will let a container know if it can process ripping queue jobs.

Because Bull is used for queueing, it's centralized persistence with Redis means that you may run many instances of Ncodr on your network (or, really anywhere) to process jobs. All that is required is connectivity to the Redis database (and likely a centralized storage). There are 3 components that make up Ncodr:

* Queue Processing (ripping and encoding can be controlled separately)

* REST API

* Web UI

Because of this, it is possible to deploy many instances of Ncodr in any combination of those components. Some example use cases:

I have 4 physical hosts on my network that could be used for encoding. Only one of those hosts has an optical drive.
> I run Ncodr on all four hosts. It auto detects that there is no optical drive on three of the hosts, and thus does not process jobs in the ripping queue for those three. I end up with four hosts capable of processing encode jobs, and one capable of processing ripping jobs. All four hosts are kept busy as long as there are jobs to be worked. Jobs may be managed over the API endpoints of _any_ of the four hosts. The UI may be accessed from _any_ of the four hosts.

I have 1 physical host and another physical host with 2 virtual machines on it. The physical host has an optical drive. I have external network availability to one of the VMs, and so I want to access the UI from it.
> I run Ncodr on all 3 hosts. On the external facing VM, I disable rip and encode job processing, so that it only serves the API and UI. On the other VM and physical host, I disable the UI and API (ie, they _only_ process jobs). Ncodr auto detects job processing capabilities. It usually does not make sense to process jobs (especially encoding) on VMs with the same underlying physical host. The CPU utilization of encoders is such that they will efficiently use all CPUs provided to them - so, it is better to have a VM given all the CPUs you can afford and let the encoding software utilize CPUs efficiently.

## Development
The quickest way to get started with Ncodr is using [docker-compose](docker-compose.yml). Ensure `docker` and `docker-compose` are available on your system. Then, in the root directory where you cloned this repo, run `docker-compose up`. This will start a local Redis container, matched with a nodeJS based container for executing Ncodr in. Since this setup is meant for development, the Ncodr application is bind mounted into the app container so that real-time changes to the code can be made, which _should_ trigger an application restart to pick up those changes. In this way, it is easy to develop quickly.

The benefit of using `docker-compose` as described above is that the node environment is exactly the same as what is run in production. However, it is entirely possible to run Ncodr locally on a development workstation. You will need NodeJS version 8.x LTS installed, with a recent version on NPM. Then, do the usual `npm install` and `npm run dev`. This will start a process on your workstation listening (by default) on port 2000.

Alternatively, you can run a single docker container with the reloading benefits described above by using the [dev Dockerfile](Dockerfile-dev): `docker build -t ncodr:dev -f Dockerfile-dev .`, then `docker run --rm -it -p 2000:2000 -v $PWD:/app ncodr:dev`

Other commands for developers to know:

`npm run lint` - Executes ESLint against the current code
`npm test` - Executes the unit tests
`npm run compile` - Executes webpack to output the minimized, ES5 compatible JavaScript in the `/dist`
`npm run version` - Return back the current version of Ncodr
`npm run docker` - Create an Ncodr production docker image, with current version tag
`npm start` - Build and start a production instance of Ncodr, running locally

## Options
Generally, see the [config](config/custom-environment-variables.yml) for what variables can be set from environment variables. For a complete set of options that can be tweaked, see the [defaults](config/default.yml).
The configuration of Ncodr is based on [node-config](https://github.com/lorenwest/node-config). You can also see its documentation on how things may be configured.

### Environment Variables

Default values are in parenthesis

`OPENSHIFT_NODEJS_PORT`: Set the port which Ncodr listens on (2000)

`LOG_LEVEL`: Application logging level (`info` in production, `debug` in development)

`REDIS_HOST`: The hostname of the redis server to use for queues (localhost)

`REDIS_PORT`: The port of the redis service to connect to (6379)

`REDIS_PASSWORD`: The password to authenticate to redis with (`no password`)

`RIP`: Override the auto-detection of whether to process ripping jobs on this host. Value can be `true`, `false` or `auto` (auto)

`ENCODE`: Override the auto-detection of whether to process encoding jobs on this host. Value can be `true`, `false` or `auto` (auto)

`API`: Override the serving of the HTTP API for queue management. Value can be `true` or `false` (true)

`UI`: Override the serving of the UI over HTTP. Value can be `true` or `false` (true)
