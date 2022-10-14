export default `

precision highp float;

in vec3 in_position;
in vec3 in_normal;
#ifdef USE_UV
  in vec2 in_uv;
#endif // USE_UV

/**
 * Varyings.
 */

out vec3 vNormalWS;
out vec3 vPosition;
#ifdef USE_UV
  out vec2 vUv;
#endif // USE_UV

/**
 * Uniforms List
 */

struct Model
{
  mat4 localToProjection;
};

uniform Model uModel;
uniform mat4 transformMat;

void
main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uModel.localToProjection * positionLocal;
  vNormalWS = in_normal;
  vec4 WStoLocal = gl_Position * transformMat;
  vPosition = vec3(WStoLocal[0], WStoLocal[1], WStoLocal[2]);
}
`;
