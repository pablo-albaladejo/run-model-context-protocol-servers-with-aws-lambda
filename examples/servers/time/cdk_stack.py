from aws_cdk import (
    App,
    DockerVolume,
    Environment,
    Stack,
    aws_lambda as lambda_,
    aws_lambda_python_alpha as lambda_python,
)
from constructs import Construct
import jsii
import os


@jsii.implements(lambda_python.ICommandHooks)
class CommandHooks:
    @jsii.member(jsii_name="afterBundling")
    def after_bundling(self, input_dir: str, output_dir: str) -> list[str]:
        return [
            f"cd {output_dir}",
            f"curl -LsSf https://astral.sh/uv/install.sh | env UV_UNMANAGED_INSTALL='{output_dir}' sh",
            f"mkdir {output_dir}/mcp_lambda_build",
            f"cp /mcp_lambda_src/pyproject.toml {output_dir}/mcp_lambda_build/pyproject.toml",
            f"cp /mcp_lambda_src/uv.lock {output_dir}/mcp_lambda_build/uv.lock",
            f"cp -r /mcp_lambda_src/src {output_dir}/mcp_lambda_build/src",
            f"UV_CACHE_DIR={output_dir}/.cache UV_DYNAMIC_VERSIONING_BYPASS=0.0.1 {output_dir}/uv build --wheel --directory {output_dir}/mcp_lambda_build",
            f"python -m pip install {output_dir}/mcp_lambda_build/dist/*.whl -t {output_dir}",
            f"rm -r {output_dir}/mcp_lambda_build {output_dir}/.cache uv",
        ]

    @jsii.member(jsii_name="beforeBundling")
    def before_bundling(self, input_dir: str, output_dir: str) -> list[str]:
        return []


class LambdaTimeMcpServer(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        lambda_python.PythonFunction(
            self,
            "ServerFunction",
            function_name="mcp-server-time",
            runtime=lambda_.Runtime.PYTHON_3_13,
            entry="function",
            memory_size=2048,
            environment={
                "LOG_LEVEL": "DEBUG",
            },
            # Workaround to install the local module during packaging for testing
            bundling=lambda_python.BundlingOptions(
                # asset_excludes=[".venv", ".mypy_cache", "__pycache__"],
                volumes=[
                    DockerVolume(
                        container_path="/mcp_lambda_src",
                        # Assume we're in examples/servers/time dir
                        host_path=os.path.join(os.getcwd(), "../../../src/python"),
                    )
                ],
                command_hooks=CommandHooks(),
            ),
        )


app = App()
env = Environment(account=os.environ["CDK_DEFAULT_ACCOUNT"], region="us-east-2")
LambdaTimeMcpServer(
    app,
    "LambdaMcpServer-Time",
    env=env,
)
app.synth()
