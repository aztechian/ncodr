FROM node:20-bookworm-slim

LABEL maintainer="Ian Martin <ian@imartin.net>" license="MIT" description="Distrubuted NodeJS app for automated ripping and encoding media"
ENV DISPLAY=":0" LANG=C.UTF-8 DEBIAN_FRONTEND=noninteractive NODE_ENV=production UID=2007 NO_UPDATE_NOTIFIER=true

RUN apt-get -qq update && \
  apt-get -qq install curl tini > /dev/null && \
  curl -s https://apt.benthetechguy.net/benthetechguy-archive-keyring.gpg -o /usr/share/keyrings/benthetechguy-archive-keyring.gpg && \
  echo "deb [signed-by=/usr/share/keyrings/benthetechguy-archive-keyring.gpg] https://apt.benthetechguy.net/debian bookworm non-free" > /etc/apt/sources.list.d/benthetechguy.list && \
  # enable contrib repo for libdvd-pkg
  sed -e '0,/main/s//main contrib/' -i /etc/apt/sources.list.d/debian.sources && \
  apt-get -qq update && \
  apt-get -qq install git makemkvcon ffmpeg libbluray-bin lsdvd dvdbackup libdvd-pkg handbrake-cli libcdio-utils cdparanoia > /dev/null && \
  dpkg-reconfigure libdvd-pkg && \
  apt-get clean && \
  apt autoclean && \
  groupadd -fg ${UID} ncodr && \
  useradd --create-home --uid ${UID} --gid ${UID} ncodr && \
  passwd -l ncodr && \
  mkdir -p /media /rips && \
  chown -R ${UID}:0 /media /rips && \
  chmod 4755 /usr/bin/bd_info

USER ${UID}
WORKDIR /app
COPY --chown=${UID}:0 . /app/
RUN yarn install && \
  yarn cache clean

EXPOSE 2000
HEALTHCHECK --start-period=15s --timeout=5s CMD /usr/bin/pgrep node
VOLUME ["/media", "/rips"]
ENTRYPOINT ["tini"]
CMD ["node", "index.js"]
