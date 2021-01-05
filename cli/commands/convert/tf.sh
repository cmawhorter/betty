#!/usr/bin/env bash

# Usage: tf.sh -c [init|tf command] -s [testing|staging|production]
# configs/[stage] must exist before using as -s target

SCRIPTDIR=$( cd "$(dirname "$0")" || exit ; pwd -P )
cd "$SCRIPTDIR" || exit

##### Functions

# print a message to stderr
warn() {
  local fmt="$1"
  shift
  printf "tf: %s\n" "$fmt" "$@" >&2
}

# print a message to stderr and exit with either
# the given status or that of the most recent command
die() {
  local st="$?"
  if [[ "$1" != *[^0-9]* ]]; then
    st="$1"
    shift
  fi
  warn "$@"
  exit "$st"
}

# print this script's usage message to stderr
usage() {
  cat <<-EOF >&2
Usage: run --command (apply|etc.) --stage (testing|staging|produciton) [--build]
Deploy changes to function with an optional build
EOF
}

##### Main


# reset all variables that might be set
tfcommand=''
stage=''
build='no'
applynow='no'

# parse command line options
while [[ "$1" != '' ]]
do
  case $1 in
    -c | --command)
      tfcommand=$2
      shift
      ;;
    --command=*)
      tfcommand=${1#*=}
      ;;
    -s | --stage)
      stage=$2
      shift
      ;;
    --stage=*)
      stage=${1#*=}
      ;;
    -b | --build)
      build=yes
      ;;
    -y | --apply)
      applynow=yes
      ;;
    --*)
      warn "unknown option -- ${1#--}"
      usage
      exit 1
      ;;
    *)
      warn "unknown option -- ${1#-}"
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ ! $stage ]]; then
  die 1 "Missing '--stage testing' target stage"
fi

stagebase=configs
stageroot="${stagebase}/${stage}"
backend=backend.config
tfvars=variables.tfvars

if [[ ! -d $stageroot ]]; then
  die 1 "The stage '${stage}' doesn't exist under ${stagebase}/ - please check the spelling!"
fi

if [[ ! -f "${stageroot}/${backend}" ]]; then
  die 1 "The backend configuration is missing at ${stageroot}/${backend}!"
fi

if [[ ! -f "${stageroot}/${tfvars}" ]]; then
  die 1 "Couldn't find the variables file here: ${stageroot}/${tfvars}"
fi

if [[ ! $tfcommand ]]; then
  echo 'No command provided. Successfuly and exiting.'
  exit 0
fi

terraform init -backend-config="${stageroot}/${backend}"

if [[ $build == 'yes' ]]; then
  if [[ $tfcommand == 'apply' ]]; then
    echo 'Tainting build resources to force build...'
    terraform taint null_resource.build
  else
    die 1 "Unsupported use for --build. It only works with apply command"
  fi
fi

# if init was requested we did that above so nothing more to do
if [[ $tfcommand != 'init' ]]; then
  if [[ $applynow == 'yes' ]]; then
    autoapply='-auto-approve'
  else
    autoapply=''
  fi
  terraform "$tfcommand" "$autoapply" -var-file="${stageroot}/${tfvars}"
fi
