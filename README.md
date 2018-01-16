# nCoder

[![Greenkeeper badge](https://badges.greenkeeper.io/aztechian/ncodr.svg)](https://greenkeeper.io/)

This is a web-based application for controlling a ripping and encoding queue.
It's intention is to support DVD and BD (Blu-Ray Disc) ripping and encoding to MPEG-4.

Utilizing [bull](https://github.com/OptimalBits/bull) for the queue control, this
app will submit jobs to the respective queue, and provide workers to process the
queued jobs.

Eventually, the tools doing the hard part (`dvdbackup`, `makemkv` and `HandBrakeCLI`) will
be in a Docker container, and this app will be the entry point. As long as the app
is configured to look at the redis location, as many containers as necessary can
be started to process jobs for parallelizing encoding work. Generally, this would be
one container per physical host, as HandBrake can be multi-threaded across CPUs - even
in a container.

`/dev/sr0` detection will let a container know if it can process ripping queue jobs.
