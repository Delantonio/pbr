import { mat4, quat, vec3, vec4 } from 'gl-matrix';
/**
 * @author {DavidPeicho}
 */

/**
 * Class containing geometric data to send to the GPU.
 *
 * This class contains the buffer sent as vertex attributes
 *
 * ## Note
 *
 * In order to get a generic geometry, attributes shouldn't be hardcoded.
 * Users might want to send extra attributes that aren't any of those.
 * I don't think it's useful for this assignment to go crazy about it.
 *
 * @category Geometry
 */
export class Geometry {
  public static createIndexBuffer(
    indices: number[],
    vertexCount: number
  ): Uint8Array | Uint16Array | Uint32Array {
    const bytePerIndexNeeded = Math.ceil(Math.log2(vertexCount) / 8);
    if (bytePerIndexNeeded > Uint16Array.BYTES_PER_ELEMENT) {
      return new Uint32Array(indices);
    } else if (bytePerIndexNeeded > Uint8Array.BYTES_PER_ELEMENT) {
      return new Uint16Array(indices);
    }
    return new Uint8Array(indices);
  }

  /** Private Fields. */

  /**
   * Vertices position
   *
   * @private
   */
  private _positions: Float32Array;

  /**
   * Vertices normal
   *
   * @private
   */
  private _normals: Float32Array;

  /**
   * Vertices UVs
   *
   * @private
   */
  private _uvs: Float32Array | null;

  /**
   * Indices
   *
   * @private
   */
  private _indices: Uint8Array | Uint16Array | Uint32Array;

  /**
   * Drawing mode of the geometry. This should be set to one of the WebGL mode
   * constant
   *
   * @private
   */
  private _mode: number;

  public constructor(
    positions: Float32Array,
    normals: Float32Array,
    uvs: Float32Array | null,
    indices: Uint8Array | Uint16Array | Uint32Array,
    mode = WebGL2RenderingContext.TRIANGLES
  ) {
    this._positions = positions;
    this._normals = normals;
    this._uvs = uvs;
    this._indices = indices;
    this._mode = mode;
  }

  /** Returns the typed array containing vertices positions. */
  public get positions(): Float32Array {
    return this._positions;
  }

  /** Returns the typed array containing vertices normals. */
  public get normals(): Float32Array {
    return this._normals;
  }

  /** Returns the typed array containing vertices UVs. */
  public get uvs(): Float32Array | null {
    return this._uvs;
  }

  /** Returns the typed array containing indices. */
  public get indices(): Uint8Array | Uint16Array | Uint32Array {
    return this._indices;
  }

  /** WebGL mode to use when drawing the geometry. */
  public get mode(): number {
    return this._mode;
  }

  private precise(x: number) : string
  {
      return x.toPrecision(3);
  }

  public translate(matrix: mat4)
  {
      console.log("Salut, je suis la translate, il y'a " + this._positions.length / 3 + " points");
      for (let i = 0; i < this._positions.length; i+=3) {
        var vec : vec4 = vec4.transformMat4(vec4.create(), vec4.set(vec4.create(), this._positions[i], this._positions[i+1], this._positions[i+2], 1), matrix);
        this._positions[i] = vec[0];
        this._positions[i + 1] = vec[1];
        this._positions[i + 2] = vec[2];
        console.log("vec3(" + this.precise(this._positions[i]) + ", " + this.precise(this._positions[i+1]) + ", " + this.precise(this._positions[i+2]) + ")");
      }
  }

  public vec_translate(vec: vec3)
  {
      console.log("Salut, je suis la translate ez, il y'a " + this._positions.length / 3 + " points");
      for (let i = 0; i < this._positions.length; i+=3) {
        this._positions[i] += vec[0];
        this._positions[i + 1] += vec[1];
        this._positions[i + 2] += vec[2];
        console.log("vec3(" + this.precise(this._positions[i]) + ", " + this.precise(this._positions[i+1]) + ", " + this.precise(this._positions[i+2]) + ")");
      }
  }
}
