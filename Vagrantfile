# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure("2") do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.box = "ubuntu/xenial64"

  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  config.vm.network "forwarded_port", guest: 2000, host: 2001
  config.vm.network "forwarded_port", guest: 6379, host: 6380

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  # config.vm.network "private_network", ip: "192.168.33.10"

  # Create a public network, which generally matched to bridged network.
  # Bridged networks make the machine appear as another physical device on
  # your network.
  # config.vm.network "public_network"

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  config.vm.synced_folder ".", "/ncodr"

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  # config.vm.provider "virtualbox" do |vb|
  #   # Display the VirtualBox GUI when booting the machine
  #   vb.gui = true
  #
  #   # Customize the amount of memory on the VM:
  #   vb.memory = "1024"
  # end
  #
  # View the documentation for the provider you are using for more
  # information on available options.
  config.vbguest.auto_update = false
  config.vm.provider :virtualbox do |vb|
    # vb.customize ["storagectl", :id, "--name", "IDEController", "--add", "ide"]
    vb.customize ["storageattach", :id, "--storagectl", "IDE", "--port", "0", "--device", "0", "--type", "dvddrive", "--medium", "isos/bluray.iso"]
  end

  # Define a Vagrant Push strategy for pushing to Atlas. Other push strategies
  # such as FTP and Heroku are also available. See the documentation at
  # https://docs.vagrantup.com/v2/push/atlas.html for more information.
  # config.push.define "atlas" do |push|
  #   push.app = "YOUR_ATLAS_USERNAME/YOUR_APPLICATION_NAME"
  # end

  # Enable provisioning with a shell script. Additional provisioners such as
  # Puppet, Chef, Ansible, Salt, and Docker are also available. Please see the
  # documentation for more information about their specific syntax and use.
  config.vm.provision "shell", env: {"DISPLAY" => ":0", "LANG" => "C.UTF-8", "DEBIAN_FRONTEND" => "noninteractive"}, inline: <<-SHELL
    echo "deb http://us.archive.ubuntu.com/ubuntu/ xenial universe
    deb http://us.archive.ubuntu.com/ubuntu/ xenial-updates universe
    deb http://us.archive.ubuntu.com/ubuntu/ xenial multiverse
    deb http://us.archive.ubuntu.com/ubuntu/ xenial-updates multiverse" >> /etc/apt/sources.list
    echo 'deb http://ppa.launchpad.net/heyarje/makemkv-beta/ubuntu xenial main' > /etc/apt/sources.list.d/makemkv.list
    echo 'deb http://ppa.launchpad.net/stebbins/handbrake-releases/ubuntu xenial main' > /etc/apt/sources.list.d/handbrake.list
    echo "deb http://deb.nodesource.com/node_8.x xenial main" > /etc/apt/sources.list.d/nodejs.list
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8771ADB0816950D8
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8540356019f7e55b
    apt-key adv --fetch-keys http://deb.nodesource.com/gpgkey/nodesource.gpg.key
    apt-get -qq update
    apt-get install -yq makemkv-oss makemkv-bin curl libav-tools libbluray-bin lsdvd dvdbackup libdvd-pkg handbrake-cli nodejs docker.io
    dpkg-reconfigure libdvd-pkg
    apt-get clean
    mkdir -p /media /rips
    chown -R ubuntu:ubuntu /media /rips
    chmod 4755 /usr/bin/bd_info

    docker run -d --restart=always -p 6379:6379 --name redis redis:latest
  SHELL
end
