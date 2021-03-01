cd rif-marketplace-cache && echo "You are on this PATH: $PWD"

# Backup the DB
dbdir=$(sudo docker volume inspect -f '{{.Mountpoint}}' "rif-marketplace-cache_cache-db")
sudo cp "$dbdir/db.sqlite" ~/db.sqlite-backup-$(date +%Y%m%d%H%M%S)
# Stop and up docker compose
sudo docker-compose down && sudo docker-compose up -d

