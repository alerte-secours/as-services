# Tiltfile for as-services
# Orchestrates docker-compose services with Tilt, providing a unified UI/logs and incremental workflows.

# Watch ignores are configured via .tiltignore

# Ensure .env exists so docker-compose gets expected env
local_resource(
  name="ensure-env",
  cmd="bash -lc 'if [ ! -f .env ] && [ -f .env.default ]; then cp .env.default .env && echo Created .env from .env.default; fi'",
  allow_parallel=True,
  auto_init=True,
)

# Optional: pre-pull builder image used in Dockerfiles
local_resource(
  name="pull-builder",
  cmd="docker pull devthefuture/dockerfile-x",
  allow_parallel=True,
  auto_init=True,
)

# Drive docker-compose with Tilt
dc = docker_compose('./docker-compose.yaml')

# Compose services are registered via docker_compose; explicit resource dependencies
# removed for compatibility with Tilt v0.35 (resource_deps not available).

# Optional groups for readability (requires Tilt Teams; keep commented if not used)
# set_team_ui_settings({
#   'resource_groups': {
#     'core': ['db', 'rabbitmq', 'redis-q-dedup', 'redis-hot-geodata', 'kvrocks-cold-geodata', 'maildev'],
#     'object-storage': ['minio', 'minio-setup'],
#     'hasura': ['hasura', 'hasura_console'],
#     'api-stack': ['api', 'files', 'tasks', 'watchers'],
#     'geo': ['osrm-car', 'osrm-foot', 'tileserver-gl', 'nominatim', 'nominatim-pg'],
#     'frontends': ['web', 'app'],
#   }
# })
