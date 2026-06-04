from argparse import ArgumentParser
from pathlib import Path
import sys

from app import compress_pdf_to_target


def build_parser():
    parser = ArgumentParser(
        description="Comprime un PDF localmente usando la misma logica de la app Flask.",
    )
    parser.add_argument("input_pdf", help="Ruta del PDF de entrada")
    parser.add_argument(
        "-o",
        "--output",
        help="Ruta del PDF de salida. Por defecto usa <nombre>-comprimido.pdf",
    )
    parser.add_argument(
        "-n",
        "--max-kb",
        type=int,
        default=999,
        help="Tamano maximo objetivo en KB. Por defecto: 999",
    )
    parser.add_argument(
        "-l",
        "--level",
        choices=("media", "alta"),
        default="media",
        help="Nivel de compresion. Por defecto: media",
    )
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    input_path = Path(args.input_pdf).expanduser().resolve()
    if not input_path.exists() or not input_path.is_file():
        parser.error(f"No se encuentra el archivo: {input_path}")
    if input_path.suffix.lower() != ".pdf":
        parser.error("El archivo de entrada debe ser un PDF")

    output_path = Path(args.output).expanduser().resolve() if args.output else input_path.with_name(
        f"{input_path.stem}-comprimido{input_path.suffix}"
    )
    max_bytes = max(1, args.max_kb) * 1024

    try:
        result = compress_pdf_to_target(
            input_path,
            output_path,
            level=args.level,
            max_bytes=max_bytes,
        )
    except Exception as error:
        print(f"Error al comprimir: {error}", file=sys.stderr)
        return 1

    original_size = input_path.stat().st_size
    compressed_size = result["compressed_size"]

    if compressed_size >= original_size:
        output_path.unlink(missing_ok=True)
        print(
            "No se genero una version mas liviana con este metodo.",
            file=sys.stderr,
        )
        return 2

    reduction = original_size - compressed_size
    reduction_percent = round((reduction / original_size) * 100, 1) if original_size else 0

    print(f"Entrada:  {input_path}")
    print(f"Salida:   {output_path}")
    print(f"Original: {original_size / 1024:.1f} KB")
    print(f"Final:    {compressed_size / 1024:.1f} KB")
    print(f"Reduccion:{reduction_percent}%")

    if not result["target_met"]:
        print(
            f"Aviso: no alcanzo el objetivo de {args.max_kb} KB, pero guardo la mejor version encontrada.",
            file=sys.stderr,
        )
        return 3

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
