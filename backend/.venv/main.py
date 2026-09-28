
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client

# Carregar as configurações do arquivo .env
load_dotenv()

# Inicializar a aplicação
app = FastAPI(title="VIVI API")

# Permitir comunicação com o React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# Página inicial da API
@app.get("/")
def inicio():
    return {
        "mensagem": "Vivi funcionando!"
    }


# Diagnóstico da conexão com o Supabase
@app.get("/teste-supabase")
def testar_supabase():

    # Etapa 1: verificar configurações
    url = os.getenv("SUPABASE_URL")
    chave = os.getenv("SUPABASE_ANON_KEY")

    if not url or not chave:
        return {
            "etapa": "Configuracao",
            "url_encontrada": bool(url),
            "chave_encontrada": bool(chave)
        }

    # Etapa 2: criar cliente Supabase
    try:
        supabase = create_client(url, chave)

    except Exception as erro:
        return {
            "etapa": "Criacao do cliente",
            "erro": type(erro).__name__
        }

    # Etapa 3: consultar a tabela
    try:
        resultado = (
            supabase
            .table("movimentacoes")
            .select("id")
            .limit(1)
            .execute()
        )

        return {
            "status": "Conexão com Supabase funcionando!",
            "etapa": "Consulta concluida"
        }

    except Exception as erro:
        return {
            "etapa": "Consulta da tabela",
            "erro": type(erro).__name__
        }
