# PB_VERSION is normally supplied by Railway at build time, forwarded from
# the PB_VERSION service variable that `mise run pb:deploy` sets from this
# repo's mise.toml [tools] pocketbase entry - so local dev and this deployed
# image run identical PocketBase code. The default below is only a fallback
# for a manual `docker build` with no PB_VERSION variable set.
FROM alpine:3.20
ARG PB_VERSION=0.40.2

RUN apk add --no-cache unzip ca-certificates && \
    wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb && \
    rm /tmp/pb.zip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

# /pb/pb_data should be a Railway volume mount so the SQLite file and any
# uploaded files persist across deploys and scale-to-zero sleep/wake cycles.
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
