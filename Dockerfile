FROM node:20-bookworm-slim
ARG VERSION=dev BUILD_DATE=now VCS_REF=dev
LABEL org.opencontainers.image.source="https://github.com/aztechian/ncodr" \
  org.opencontainers.image.title="ncodr" \
  org.opencontainers.image.description="Distrubuted NodeJS app for automated ripping and encoding media" \
  org.opencontainers.image.url="https://github.com/aztechian/ncodr" \
  org.opencontainers.image.documentation="https://github.com/aztechian/ncodr" \
  org.opencontainers.image.vendor="Ian Martin" \
  org.opencontainers.image.authors="Ian Martin <ian@imartin.net>" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="$VERSION" \
  org.opencontainers.image.revision="$VCS_REF" \
  org.opencontainers.image.created="$BUILD_DATE" \
  org.opencontainers.image.base.name="node:20-bookworm-slim"

ENV DISPLAY=":0" \
  LANG=C.UTF-8 \
  DEBIAN_FRONTEND=noninteractive \
  UID=2007 \
  NO_UPDATE_NOTIFIER=true \
  NODE_ENV=production \
  # Set app configs to match the setup of docker image and volumes
  RIPPER_OUTPUT=/rips \
  ENCODER_OUTPUT=/encoded \
  ENCODER_INPUT=/rips

RUN apt-get -qq update && \
  apt-get -qq install curl tini git > /dev/null && \
  curl -s https://apt.benthetechguy.net/benthetechguy-archive-keyring.gpg -o /usr/share/keyrings/benthetechguy-archive-keyring.gpg && \
  echo "deb [signed-by=/usr/share/keyrings/benthetechguy-archive-keyring.gpg] https://apt.benthetechguy.net/debian bookworm non-free" > /etc/apt/sources.list.d/benthetechguy.list && \
  # enable contrib repo for libdvd-pkg
  sed -e '0,/main/s//main contrib/' -i /etc/apt/sources.list.d/debian.sources && \
  apt-get -qq update && \
  apt-get -qq install makemkvcon libbluray-bin lsdvd dvdbackup libdvd-pkg handbrake-cli libcdio-utils cdparanoia > /dev/null && \
  dpkg-reconfigure libdvd-pkg && \
  apt-get clean && \
  apt autoclean && \
  groupadd -fg ${UID} ncodr && \
  useradd --create-home --uid ${UID} --gid ${UID} ncodr && \
  passwd -l ncodr && \
  mkdir -p /encoded /rips && \
  chown -R ${UID}:0 /encoded /rips && \
  chmod 4755 /usr/bin/bd_info

USER ${UID}
WORKDIR /app
COPY --chown=${UID}:0 . /app/
RUN yarn install && \
  yarn cache clean

EXPOSE 2000
HEALTHCHECK --start-period=15s --timeout=5s CMD /usr/bin/pgrep node
VOLUME ["/encoded", "/rips"]
ENTRYPOINT ["tini"]
CMD ["node", "index.js"]
