export default `

precision highp float;
#define NB_LIGHTS 4

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
out vec3 pLights[NB_LIGHTS];
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

struct Offset
{
  float x;
  float y;
};

uniform Model uModel;
uniform mat4 translationMat;
uniform Offset uOffset; // offset implementation to test the difference with translationMatrix

void
main()
{
  vec4 positionLocal = vec4(in_position, 1.0);

  //vec3 offset = vec3(uOffset.x, uOffset.y, 0.0);
  //vec4 positionLocal = vec4(in_position + offset, 1.0);

  gl_Position = uModel.localToProjection * positionLocal;
  vNormalWS = in_normal;
  vPosition = (translationMat * positionLocal).xyz;
}
`;
