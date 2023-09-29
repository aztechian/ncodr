# Ncodr

[![GitHub release](https://img.shields.io/github/v/release/aztechian/ncodr?logo=GitHub)](https://github.com/aztechian/ncodr/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aztechian/ncodr/build.yaml?logo=github)](https://travis-ci.org/aztechian/ncodr)
[![GitHub good first issues](https://img.shields.io/github/issues-search?query=repo%3Aaztechian%2Fncodr%20label%3A%22first%20issue%22%20is%3Aopen&logo=github&label=good%20first%20issues&color=purple)
](https://github.com/aztechian/ncodr/issues?q=is%3Aissue+is%3Aopen+label%3A%22first+issue%22)
[![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/aztechian/ncodr?logo=codeclimate)](https://codeclimate.com/github/aztechian/ncodr/maintainability)
[![Codecov](https://img.shields.io/codecov/c/github/aztechian/ncodr?token=PkAzpQMTOV&logo=codecov)](https://app.codecov.io/gh/aztechian/ncodr)
[![Docker Image Version (latest semver)](https://img.shields.io/docker/v/aztechian/ncodr?sort=semver&logo=docker)](https://hub.docker.com/r/aztechian/ncodr/)
[![Docker Pulls](https://img.shields.io/docker/pulls/aztechian/ncodr?logo=docker)](https://hub.docker.com/r/aztechian/ncodr/)
[![GitHub](https://img.shields.io/github/license/aztechian/ncodr?logo=license)](https://github.com/aztechian/ncodr/blob/master/LICENSE)

Ncodr (en-code-er) is a web-based, distributed application for controlling a ripping and encoding queue.
It's intention is to support DVD and BD (Blu-Ray Disc) ripping and encoding to MPEG-4. By default, it encodes to an "iTunes"
compatible `m4v` container with h264 video codec. Audio encoding can be easily changed from the options field that is submitted with a job.

Utilizing [bull](https://github.com/OptimalBits/bull) for the queue control, this
app will submit jobs to the respective queue, and provide workers to process the
queued jobs. Bull is backed by a [Redis](https://redis.io) database for persistent queue information storage.
For a production environment, Redis should be available as an external service to Ncodr. A persistent storage for Redis is not
provided from this project.

Additionally, Ncodr supplies a RESTful API around the bull queues, so that jobs may be easily submitted via HTTP interfaces.

The tools doing the hard part (`dvdbackup`, `makemkvcon` and `HandBrakeCLI`) are expected to be available on the `$PATH` for Ncodr to use.
The primary packaging for this app is a container, which provides all the tools needed, and makes Ncodr the entry point. The
simplest way to get running is by using the production [docker-compose](docker-compose.yml). This uses a pre-built docker image that is published
to [docker hub](https://hub.docker.com/r/aztechian/ncodr).

Alternatively, zip files of the compiled app with configuration, `package.json` and node_modules for production is available
from the [releases](https://github.com/aztechian/ncodr/releases) page. Given a Node.js installation on the target system, it should run
with a simple `yarn run start` command.

As long as the app is configured to look at the redis location, as many containers as necessary can
be started to process jobs for parallelizing encoding work. Generally, this would be
one container per physical host, as HandBrake can be multi-threaded across CPUs - even
in a container.

`/dev/sr0` detection will let a container know if it can process ripping queue jobs. Be aware that you may need to run
a container that will rip discs as root so that it has permission to access device files directly. There are some examples
of additional permissions needed for device usage in the [docker-compose](docker-compose.yml).
By default, Ncodr runs as a high-numbered UID (not `root`) so that it is usable on container management systems (Kubernetes, OpenShift).
If you are running separate encoding containers, they will likely work just fine as the default, non-root user, or you can specify another
UID for the container to run as.

Because Bull is used for queueing, it's centralized persistence with Redis means that you may run many instances of Ncodr
on your network (or really, anywhere) to process jobs. All that is required is connectivity to the Redis database
(and likely a common storage). There are 3 components that make up Ncodr:

* Queue Processing (ripping and encoding can be controlled separately)

* REST API

* Web UI

Because of this, it is possible to deploy many instances of Ncodr in any combination of those components. Some example use cases:

I have 4 physical hosts on my network that could be used for encoding. Only one of those hosts has an optical drive.
> I run Ncodr on all four hosts. It auto detects that there is no optical drive on three of the hosts, and thus does not process jobs in the ripping queue for those three. I end up with four hosts capable of processing encode jobs, and one capable of processing ripping jobs. All four hosts are kept busy as long as there are jobs to be worked. Jobs may be managed over the API endpoints of _any_ of the four hosts. The UI may be accessed from _any_ of the four hosts.

I have 1 physical host and another physical host with 2 virtual machines on it. The physical host has an optical drive. I have external network availability to one of the VMs, and so I want to access the UI from it.
> I run Ncodr on all 3 hosts. On the external facing VM, I disable rip and encode job processing, so that it only serves the API and UI. On the other VM and physical host, I disable the UI and API (ie, they _only_ process jobs). Ncodr auto detects job processing capabilities. It usually does not make sense to process jobs (especially encoding) on VMs with the same underlying physical host. The CPU utilization of encoders is such that they will efficiently use all CPUs provided to them - so, it is better to have a VM given all the CPUs you can afford and let the encoding software utilize CPUs efficiently.

## Development

The quickest way to get started with Ncodr is with devcontainers in VSCode. There is also a docker-compose file available:
    ln -s docker-compose.dev.yml docker-compose.override.yml
    docker-compose up

Ensure `docker` and `docker-compose` are available on your system. This will start a local Redis container, matched with a nodeJS based
container for executing Ncodr in. Since this setup is meant for development, the Ncodr application is bind mounted into the app container
so that real-time changes to the code can be made, which _should_ trigger an application restart to pick up those changes. In this way, it
is easy to develop quickly.

The benefit of using `docker-compose` as described above is that the node environment is exactly the same as what is run in production. However,
it is of course possible to run Ncodr locally on a development workstation. You will need NodeJS version >=8.x installed, with a recent version on
NPM. Then, do the usual `yarn install` and `yarn serve`. This will start a process on your workstation listening (by default) on port 2000.

Other commands for developers to know:

| Command | Description |
|---------|-------------|
|`yarn serve`| Starts ncodr locally in development mode, with reloading on code changes |
|`yarn lint`| Executes ESLint against the current code |
|`yarn test` | Executes the unit tests |
|`yarn run version` | Return back the current version of Ncodr |
|`yarn docker` | Create an Ncodr production docker image, with current version tag |
|`yarn start` | Start a production instance of Ncodr, running locally |

You will notice there are a few variations of docker-compose files available:
[docker-compose](docker-compose.yml) is an example of a production deployment of Ncodr
[docker-compose.dev](docker-compose.dev.yml) is for use when developing Ncodr on a local workstation
[docker-compose.ci](docker-compose.ci.yml) is to stub out some production settings when testing in Travis CI pipelines

## Options

See the [config](config/custom-environment-variables.yml) for what variables can be set from environment variables. These generally follow
the format of `<SECTION>_<KEY>`, so to set `Ripper` -> `Device` you would set the environment variable like: `RIPPER_DEVICE=/dev/sr2`
For a complete set of options that can be tweaked, see the [defaults](config/default.yml).
The configuration of Ncodr is based on [node-config](https://github.com/lorenwest/node-config). You can also see its documentation on how things may be configured.

### Environment Variables

Below are some of the more important settings that can be used for configuring Ncodr.
Default values are in parenthesis

|Variable Name| Description | Default |
|-------------|-------------|---------|
|`PORT`| Set the port on which Ncodr listens| 2000|
|`LOG_LEVEL`| Application logging level | `info` in production, `debug` in development|
|`REDIS_HOST`| The hostname of the redis server to use for queues | localhost|
|`REDIS_PORT`| The port of the redis service to connect | 6379|
|`REDIS_PASSWORD`| The password to authenticate to redis | `no password`|
|`RIP`| Override the auto-detection of whether to process ripping jobs on this host. Value can be `true`, `false` or `auto` | auto|
|`ENCODE`| Override the auto-detection of whether to process encoding jobs on this host. Value can be `true`, `false` or `auto`| auto|
|`API`| Override the serving of the HTTP API for queue management. Value can be `true` or `false`| true|
|`UI`| Override the serving of the UI over HTTP. Value can be `true` or `false`| true|
