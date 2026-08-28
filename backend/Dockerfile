FROM php:8.3-fpm-alpine

# Install extension installer
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

# Install system utilities and required PHP extensions
RUN apk add --no-cache bash git curl \
    && install-php-extensions pdo_pgsql redis gd bcmath opcache zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
