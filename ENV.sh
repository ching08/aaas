export AAAS_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export NODE_CONFIG_DIR="./etc"


#--------------------------
# function
#--------------------------

function add_path() {
    if [[ $PATH  =~ .*"${1}".* ]] ; then
        set x 1
    else
	if [[ -d "$1" || -L "$1" ]] ; then
	                export PATH=${1}:$PATH
			    else
	                echo "-warning: $1 does not exists. can not add it to PATH"
			        
			    fi
    fi
    
} 


function print() {
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
    printf "${BLUE}$1${NC}\n"
} 

#--------------------------
# setup aaas source code and unit test
#--------------------------

if [ ! -d "${AAAS_HOME}/node_modules" ] ; then
    print "-npm installing for '${AAAS_HOME}/node_modules'"
    sudo npm install
else
    print "'${AAAS_HOME}/node_modules' exists. Please use 'npm update' to upgrade"
fi


#--------------------------
# setup comp_test
#--------------------------

if [ ! -d "${AAAS_HOME}/comp_tests/robohydra/node_modules" ] ; then
    print "-npm installing for '${AAAS_HOME}/comp_tests/robohydra/node_modules'"
    sudo npm install
else
    print "'${AAAS_HOME}/comp_tests/robohydra/node_modules' exists. Please use 'npm update' to upgrade"
fi

