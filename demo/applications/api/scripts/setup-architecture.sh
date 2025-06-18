#!/bin/bash

# 🏗️ Script de Configuración de Arquitectura Hexagonal
# MCP Demo - Clean Architecture Setup

set -e

echo "🏗️ Configurando Arquitectura Hexagonal para MCP Demo..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

log_info "Verificando estructura de directorios..."

# Crear estructura de directorios si no existe
DIRECTORIES=(
    "src/domain/entities"
    "src/domain/repositories"
    "src/domain/services"
    "src/application/use-cases/chat"
    "src/application/use-cases/admin"
    "src/interfaces/controllers"
    "src/infrastructure/repositories"
    "src/infrastructure/services"
    "src/infrastructure/middleware"
    "src/shared/schemas"
    "tests/unit/domain"
    "tests/unit/application"
    "tests/integration"
    "scripts"
)

for dir in "${DIRECTORIES[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_success "Creado directorio: $dir"
    else
        log_info "Directorio ya existe: $dir"
    fi
done

# Verificar dependencias
log_info "Verificando dependencias..."

REQUIRED_DEPS=(
    "@middy/core"
    "@middy/http-cors"
    "@middy/http-error-handler"
    "@middy/http-json-body-parser"
    "@middy/validator"
    "aws-jwt-verify"
    "zod"
    "inversify"
    "reflect-metadata"
)

MISSING_DEPS=()

for dep in "${REQUIRED_DEPS[@]}"; do
    if ! npm list "$dep" >/dev/null 2>&1; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    log_warning "Dependencias faltantes detectadas:"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    
    read -p "¿Instalar dependencias faltantes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Instalando dependencias..."
        npm install "${MISSING_DEPS[@]}" --legacy-peer-deps
        log_success "Dependencias instaladas"
    else
        log_warning "Instala las dependencias manualmente: npm install ${MISSING_DEPS[*]} --legacy-peer-deps"
    fi
else
    log_success "Todas las dependencias están instaladas"
fi

# Verificar configuración de TypeScript
log_info "Verificando configuración de TypeScript..."

if [ ! -f "tsconfig.json" ]; then
    log_error "No se encontró tsconfig.json"
    exit 1
fi

# Verificar que reflect-metadata esté habilitado
if ! grep -q "experimentalDecorators.*true" tsconfig.json; then
    log_warning "Configuración de decoradores no encontrada en tsconfig.json"
    log_info "Asegúrate de que tu tsconfig.json incluya:"
    echo "  \"experimentalDecorators\": true,"
    echo "  \"emitDecoratorMetadata\": true,"
fi

# Crear archivo de configuración de ambiente
log_info "Creando archivo de configuración de ambiente..."

ENV_FILE=".env.example"
cat > "$ENV_FILE" << EOF
# 🏗️ Configuración de Arquitectura Hexagonal - MCP Demo

# DynamoDB Tables
CHAT_TABLE_NAME=MCPDemoStack-dev-chat-messages
USERS_TABLE_NAME=MCPDemoStack-dev-users
SESSIONS_TABLE_NAME=MCPDemoStack-dev-user-sessions

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Lambda Functions
WEATHER_ALERTS_FUNCTION_NAME=MCPDemoStack-dev-weather-alerts
TIME_FUNCTION_NAME=MCPDemoStack-dev-time

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info

# AWS Configuration
AWS_REGION=us-east-1
EOF

log_success "Archivo de configuración creado: $ENV_FILE"

# Crear script de validación de arquitectura
log_info "Creando script de validación..."

VALIDATION_SCRIPT="scripts/validate-architecture.sh"
cat > "$VALIDATION_SCRIPT" << 'EOF'
#!/bin/bash

# 🏗️ Script de Validación de Arquitectura Hexagonal

set -e

echo "🔍 Validando Arquitectura Hexagonal..."

# Verificar que las interfaces estén implementadas
echo "Verificando implementaciones de repositorios..."

REPO_INTERFACES=(
    "src/domain/repositories/ChatMessageRepository.ts"
    "src/domain/repositories/UserRepository.ts"
)

REPO_IMPLEMENTATIONS=(
    "src/infrastructure/repositories/DynamoDBChatMessageRepository.ts"
    "src/infrastructure/repositories/DynamoDBUserRepository.ts"
)

for interface in "${REPO_INTERFACES[@]}"; do
    if [ ! -f "$interface" ]; then
        echo "❌ Falta interfaz: $interface"
    else
        echo "✅ Interfaz encontrada: $interface"
    fi
done

for impl in "${REPO_IMPLEMENTATIONS[@]}"; do
    if [ ! -f "$impl" ]; then
        echo "❌ Falta implementación: $impl"
    else
        echo "✅ Implementación encontrada: $impl"
    fi
done

# Verificar casos de uso
echo "Verificando casos de uso..."

USE_CASES=(
    "src/application/use-cases/chat/SendMessageUseCase.ts"
    "src/application/use-cases/admin/GetSystemMetricsUseCase.ts"
    "src/application/use-cases/admin/GetSessionsUseCase.ts"
)

for use_case in "${USE_CASES[@]}"; do
    if [ ! -f "$use_case" ]; then
        echo "❌ Falta caso de uso: $use_case"
    else
        echo "✅ Caso de uso encontrado: $use_case"
    fi
done

# Verificar controladores
echo "Verificando controladores..."

CONTROLLERS=(
    "src/interfaces/controllers/chat.controller.ts"
    "src/interfaces/controllers/admin.controller.ts"
)

for controller in "${CONTROLLERS[@]}"; do
    if [ ! -f "$controller" ]; then
        echo "❌ Falta controlador: $controller"
    else
        echo "✅ Controlador encontrado: $controller"
    fi
done

# Verificar contenedor de dependencias
if [ ! -f "src/infrastructure/container.ts" ]; then
    echo "❌ Falta contenedor de dependencias"
else
    echo "✅ Contenedor de dependencias encontrado"
fi

# Verificar middleware
MIDDLEWARE=(
    "src/infrastructure/middleware/auth.middleware.ts"
)

for middleware in "${MIDDLEWARE[@]}"; do
    if [ ! -f "$middleware" ]; then
        echo "❌ Falta middleware: $middleware"
    else
        echo "✅ Middleware encontrado: $middleware"
    fi
done

echo "🎉 Validación completada"
EOF

chmod +x "$VALIDATION_SCRIPT"
log_success "Script de validación creado: $VALIDATION_SCRIPT"

# Crear script de testing
log_info "Creando script de testing..."

TEST_SCRIPT="scripts/test-architecture.sh"
cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash

# 🧪 Script de Testing de Arquitectura Hexagonal

set -e

echo "🧪 Ejecutando tests de arquitectura..."

# Compilar TypeScript
echo "Compilando TypeScript..."
npm run build

# Ejecutar tests si existen
if [ -d "tests" ] && [ "$(ls -A tests)" ]; then
    echo "Ejecutando tests..."
    npm test
else
    echo "⚠️  No se encontraron tests. Crea tests en el directorio tests/"
fi

# Verificar linting
if command -v eslint &> /dev/null; then
    echo "Ejecutando ESLint..."
    npx eslint src/ --ext .ts
else
    echo "⚠️  ESLint no está configurado"
fi

echo "🎉 Tests completados"
EOF

chmod +x "$TEST_SCRIPT"
log_success "Script de testing creado: $TEST_SCRIPT"

# Crear README de arquitectura
log_info "Creando README de arquitectura..."

ARCH_README="ARCHITECTURE_README.md"
cat > "$ARCH_README" << 'EOF'
# 🏗️ Guía de Arquitectura Hexagonal - MCP Demo

## 📋 Resumen

Este proyecto implementa una **arquitectura hexagonal (clean architecture)** siguiendo los principios SOLID, utilizando tecnologías modernas como Middy, Zod, Inversify y TypeScript.

## 🎯 Principios Aplicados

- **Single Responsibility**: Cada clase tiene una única responsabilidad
- **Open/Closed**: Abierto para extensión, cerrado para modificación
- **Liskov Substitution**: Implementaciones intercambiables
- **Interface Segregation**: Interfaces específicas y cohesivas
- **Dependency Inversion**: Dependencias de abstracciones, no implementaciones

## 🏛️ Estructura de Capas

```
src/
├── domain/                    # 🎯 Capa de Dominio (Core)
│   ├── entities/             # Entidades de negocio
│   ├── repositories/         # Interfaces de repositorios
│   └── services/            # Servicios de dominio
├── application/              # 📋 Capa de Aplicación
│   └── use-cases/           # Casos de uso
├── interfaces/               # 🌐 Capa de Interfaces
│   └── controllers/         # Controladores HTTP
├── infrastructure/           # 🔧 Capa de Infraestructura
│   ├── repositories/        # Implementaciones de repositorios
│   ├── services/           # Implementaciones de servicios
│   ├── middleware/         # Middleware de autenticación
│   └── container.ts        # Inyección de dependencias
└── shared/                  # 📦 Código compartido
    └── schemas/            # Esquemas de validación
```

## 🚀 Comandos Útiles

### Validación
```bash
./scripts/validate-architecture.sh
```

### Testing
```bash
./scripts/test-architecture.sh
```

### Desarrollo
```bash
npm run dev          # Desarrollo local
npm run build        # Compilar
npm run start        # Producción
```

## 🔧 Configuración

1. Copia `.env.example` a `.env`
2. Configura las variables de entorno
3. Ejecuta `npm install`
4. Ejecuta `npm run build`

## 📚 Documentación Completa

Ver `ARCHITECTURE.md` para documentación detallada de la arquitectura.

## 🧪 Testing

- **Unit Tests**: `tests/unit/`
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `tests/e2e/`

## 🔍 Monitoreo

- Logs estructurados con niveles
- Métricas de sistema
- Health checks automáticos
- Alertas configurables

---

**Esta arquitectura proporciona una base sólida para aplicaciones serverless escalables y mantenibles.**
EOF

log_success "README de arquitectura creado: $ARCH_README"

# Resumen final
echo
log_success "🏗️ Configuración de Arquitectura Hexagonal Completada!"
echo
echo "📁 Estructura creada:"
echo "  - Directorios de arquitectura"
echo "  - Scripts de validación y testing"
echo "  - Archivos de configuración"
echo "  - Documentación"
echo
echo "🚀 Próximos pasos:"
echo "  1. Configura las variables de entorno en .env"
echo "  2. Ejecuta: ./scripts/validate-architecture.sh"
echo "  3. Ejecuta: ./scripts/test-architecture.sh"
echo "  4. Lee: ARCHITECTURE_README.md"
echo
echo "📚 Documentación completa en: ARCHITECTURE.md"
echo
log_success "¡Arquitectura lista para desarrollo!" 