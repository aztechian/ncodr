FROM ubuntu:16.04

LABEL maintainer="Ian Martin <ian@imartin.net>" license="MIT" description="Distrubuted NodeJS app for automated ripping and encoding media"
ENV DISPLAY=":0" LANG=C.UTF-8 DEBIAN_FRONTEND=noninteractive NODE_ENV=production U=ncodr

RUN echo "deb http://us.archive.ubuntu.com/ubuntu/ xenial universe \
  deb http://us.archive.ubuntu.com/ubuntu/ xenial-updates universe \
  deb http://us.archive.ubuntu.com/ubuntu/ xenial multiverse \
  deb http://us.archive.ubuntu.com/ubuntu/ xenial-updates multiverse" >> /etc/apt/sources.list && \
  echo 'deb http://ppa.launchpad.net/heyarje/makemkv-beta/ubuntu xenial main' > /etc/apt/sources.list.d/makemkv.list && \
  echo 'deb http://ppa.launchpad.net/stebbins/handbrake-releases/ubuntu xenial main' > /etc/apt/sources.list.d/handbrake.list && \
  apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8771ADB0816950D8 && \
  apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8540356019f7e55b && \
  apt-get -qq update && \
  apt-get install -yq git makemkv-oss makemkv-bin curl libav-tools libbluray-bin lsdvd dvdbackup libdvd-pkg handbrake-cli && \
  dpkg-reconfigure libdvd-pkg && \
  apt-get clean && \
  groupadd -fg 10298 ${U} && \
  useradd --create-home --uid 10298 --gid ${U} ${U} && \
  passwd -l ${U} && \
  mkdir -p /media /rips && \
  chown -R 10298:10298 /media /rips && \
  chmod 4755 /usr/bin/bd_info
# apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 816950D8 && \

COPY ["./package*", "./README.md", "/app/"]
COPY ["./build", "/app/build"]
COPY ["./config", "/app/config"]
WORKDIR /app
RUN apt-key adv --fetch-keys http://deb.nodesource.com/gpgkey/nodesource.gpg.key && \
  echo "deb http://deb.nodesource.com/node_8.x xenial main" >> /etc/apt/sources.list && \
  apt-get -qq update && \
  apt-get install -yq nodejs && \
  npm install && \
  chown -R ${U}: /app

USER ${U}
EXPOSE 2000
VOLUME ['/rips','/media']
ENTRYPOINT ["/usr/bin/npm"]
CMD ["start"]